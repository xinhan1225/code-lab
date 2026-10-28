import { LEVELS } from './levels.mjs';
import { compile, createState, applyCommand, isPathAhead, getLevelInfo, attachRules } from './core.mjs';
import { loadProgress, saveProgress } from './progress.mjs';
import { LabRenderer } from './renderer.mjs';
import { initTour } from './tour.mjs';
import { PAGE_LEVELS, compilePageCode, applyPageCommand, checkPageGoals, createPageSnapshot } from './page-lab.mjs';

const $ = id => document.getElementById(id);
let store;
try { store = localStorage; } catch { store = { getItem: () => null, setItem() { throw new Error('blocked'); } }; }
const progress = loadProgress(store);
let track = progress.track;
let language = track === 'page' ? 'js' : progress.language;
let level = (track === 'page' ? PAGE_LEVELS : LEVELS).find(item => item.id === (track === 'page' ? progress.pageLevelId : progress.levelId)) || (track === 'page' ? PAGE_LEVELS : LEVELS)[0];
let state = createState(track === 'page' ? LEVELS[0] : level);
let mode = 'idle', queue = null, timer = null, generation = 0, activeLine = 0, hintIndex = 0, toastTimer, audio;
let escapeEditor = false;
let initialized = false;
const code = $('code');
const renderer = new LabRenderer($('board'));
const pageSnapshot = createPageSnapshot(document);
const lessons = () => track === 'page' ? PAGE_LEVELS : LEVELS;
const lessonNumber = () => lessons().indexOf(level) + 1;
const lessonCode = () => String(lessonNumber()).padStart(2, '0');
const completed = () => track === 'page' ? progress.pageCompleted : progress.completed[language];
const nextLesson = () => lessons()[lessonNumber()] || lessons().find(item => !completed().includes(item.id));
const mapLevel = () => track === 'page' ? LEVELS[0] : level;
const commandLabels = { forward: '前进一步', left: '向左转 90°', right: '向右转 90°' };
const solutionButton = document.createElement('button');
solutionButton.id = 'solution-button';solutionButton.className = 'solution-button';solutionButton.textContent = '查看参考答案';solutionButton.hidden = true;
document.querySelector('.hint-strip').append(solutionButton);

function persist() {
  progress.track = track;
  if (track === 'page') progress.pageLevelId = level.id;
  else { progress.language = language; progress.levelId = level.id; }
  saveProgress(store, progress);
}
function saveDraft() { progress.drafts[`${track === 'page' ? 'page' : language}:${level.id}`] = code.value; persist(); }
function toast(message) {
  clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;
  toastTimer=setTimeout(()=>$('toast').hidden=true,2400);
}
function log(message, type = '') {
  const p=document.createElement('p');p.textContent=message;
  if(type)p.className=`log-${type}`;
  $('console').append(p);
  while($('console').children.length>100)$('console').firstElementChild.remove();
  $('console').scrollTop=$('console').scrollHeight;
}
function setMode(next) {
  mode=next;
  const map={idle:['等待指令','READY'],running:['正在执行','RUNNING'],paused:['已暂停','PAUSED'],done:['执行结束','FINISHED'],error:['需要调试','ERROR'],won:['实验完成','SUCCESS']};
  $('board-badge').textContent=map[mode][0];$('board-badge').className=`board-badge ${mode}`;
  $('terminal-state').textContent=map[mode][1];
  $('run-icon').textContent=mode==='running'?'■':'▶';
  $('run-label').textContent=mode==='running'?'停止运行':mode==='paused'?'继续运行':'运行代码';
  document.querySelector('.editor-window').classList.toggle('executing',mode==='running');
  document.querySelector('.editor-window').classList.toggle('failed',mode==='error');
  $('step-button').disabled=mode==='running'||mode==='won';
}
function cancelExecution() { generation++;clearTimeout(timer);timer=null;queue=null; }
function restoreEnvironment() {
  pageSnapshot.restore();
  if(track==='page'&&level.setupCode)for(const command of compilePageCode(level.setupCode))applyPageCommand(command,document);
  document.querySelectorAll('.target-highlight').forEach(el=>el.classList.remove('target-highlight'));
}
function resetScene(restorePage = false) {
  cancelExecution();renderer.clearCelebration();
  if (restorePage) restoreEnvironment();
  state=createState(mapLevel());activeLine=0;setMode('idle');$('completion').hidden=true;
  updateBoard();highlightCode();
}
function updateSidebar() {
  const previousTop=$('mission-list').scrollTop,previousLeft=$('mission-list').scrollLeft;
  $('mission-list').replaceChildren();
  let stage;
  lessons().forEach((item,index)=>{
    if (stage !== item.stage) {
      stage = item.stage;
      const heading = document.createElement('p'); heading.className = 'stage-heading'; heading.textContent = stage || '基础练习'; $('mission-list').append(heading);
    }
    const done=completed().includes(item.id), button=document.createElement('button');
    button.className=`mission-button${item.id===level.id?' active':''}${done?' done':''}`;
    button.dataset.level=item.id;button.setAttribute('aria-current',item.id===level.id?'step':'false');
    button.setAttribute('aria-label',`实验 ${index+1} ${item.name}${done?'，已完成':''}`);
    const num=document.createElement('span');num.className='number';num.textContent=String(index+1).padStart(2,'0');
    const name=document.createElement('span');name.textContent=item.name;
    const mark=document.createElement('span');mark.className='mission-mark';mark.textContent=item.id===level.id?'›':done?'✓':'·';
    button.append(num,name,mark);button.addEventListener('click',()=>selectLevel(item.id));$('mission-list').append(button);
  });
  const count=completed().length, total=lessons().length;
  $('progress-language').textContent=track==='page'?'网页改造进度':`${language==='js'?'JavaScript':'Rust'} 进度`;
  $('progress-count').innerHTML=`${count} <span>/ ${total}</span>`;
  $('progress-fill').style.width=`${count/total*100}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow',count);
  document.querySelector('.progress-track').setAttribute('aria-valuemax',total);
  const list=$('mission-list'),active=list.querySelector('.active');list.scrollTop=previousTop;list.scrollLeft=previousLeft;
  if(list.scrollHeight>list.clientHeight){if(active.offsetTop<list.scrollTop)list.scrollTop=active.offsetTop;else if(active.offsetTop+active.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=active.offsetTop+active.offsetHeight-list.clientHeight;}
  if(list.scrollWidth>list.clientWidth){if(active.offsetLeft<list.scrollLeft)list.scrollLeft=active.offsetLeft;else if(active.offsetLeft+active.offsetWidth>list.scrollLeft+list.clientWidth)list.scrollLeft=active.offsetLeft+active.offsetWidth-list.clientWidth;}
}
function selectLevel(id,newLanguage=language,newTrack=track) {
  if(initialized)saveDraft();cancelExecution();
  track=newTrack;language=track==='page'?'js':newLanguage;hintIndex=0;
  level=lessons().find(item=>item.id===id)||lessons()[0];
  code.value=progress.drafts[`${track==='page'?'page':language}:${level.id}`]??level.starters[language];
  document.body.classList.toggle('mode-web',track==='page');
  document.documentElement.dataset.track=track;
  $('path-title').textContent=track==='page'?'改造实验室':'修复机器人';
  $('path-summary').textContent=track==='page'?`${PAGE_LEVELS.length} 个趣味实验 · JavaScript`:`${LEVELS.length} 个实验 · 2 种语言`;
  $('lab-tab').classList.toggle('selected',track==='robot');$('page-tab').classList.toggle('selected',track==='page');
  $('tab-rust').disabled=track==='page';$('tab-rust').title=track==='page'?'网页 DOM 实验使用 JavaScript，Rust 可在机器人路线中练习':'';
  $('breadcrumb').textContent=`实验 ${lessonCode()} / ${level.stage || level.concept}`;
  $('mission-title').textContent=level.title;
  $('mission-objective').textContent=level.objective;
  $('task-difficulty').textContent=`${'●'.repeat(level.difficulty||1)}${'○'.repeat(5-(level.difficulty||1))} · ${level.suggestedMinutes||2} 分钟`;
  $('new-skill').textContent=`本关学会：${level.newSkill||level.concept}`;
  $('concept-tags').replaceChildren();
  const tags=level.concept.split(/[、与]/).filter(Boolean);tags.push(language==='js'?'JavaScript':'Rust');
  tags.forEach(text=>{const tag=document.createElement('span');tag.className='tag';tag.textContent=text;$('concept-tags').append(tag);});
  document.querySelectorAll('[data-language]').forEach(button=>{const active=button.dataset.language===language;button.classList.toggle('active',active);button.setAttribute('aria-selected',active);});
  $('filename').textContent=`${track==='page'?'web':'mission'}_${lessonCode()}.${language==='js'?'js':'rs'}`;
  $('editor-language').textContent=language==='js'?'JAVASCRIPT':'RUST';
  $('board-number').textContent=lessonCode();$('board-title').textContent=level.name;$('sector').textContent=lessonCode();
  const info=getLevelInfo(mapLevel());$('grid-size').textContent=track==='page'?'REAL DOM · LIVE':`${info.width} × ${info.height} GRID`;
  $('scene-subtitle').textContent=track==='page'?'当前网页，就是你的实验对象':'收集能量，到达出口';
  $('web-room-message').hidden=track!=='page';$('robot-goals').hidden=track==='page';$('web-goals').hidden=track!=='page';
  $('syntax-note').firstChild.textContent=track==='page'?'支持本路线列出的真实 DOM 操作；切换关卡后页面复位。':'教学模式支持本关使用的指令与语法。';
  $('target-list').replaceChildren();
  if(track==='page'){
    const targets=[...new Set(compilePageCode(level.solutions.js).map(command=>command.target))];
    targets.forEach(target=>{const button=document.createElement('button');button.textContent=target==='body'?'document.body':target==='root'?'document.documentElement':target;button.title='点击定位页面中的真实元素';button.addEventListener('click',()=>{const element=target==='body'?document.body:target==='root'?document.documentElement:document.querySelector(target);document.querySelectorAll('.target-highlight').forEach(el=>el.classList.remove('target-highlight'));element.classList.add('target-highlight');element.scrollIntoView({block:'nearest',behavior:renderer.reduced?'instant':'smooth'});});$('target-list').append(button);});
  }
  $('inline-hint').textContent=level.explanation[language];$('hint-count').textContent='';solutionButton.hidden=true;
  $('mentor-message').textContent=track==='page'?'这次，你的实验对象是整个网页。运行代码后，抬头看看真实的灯光、名称和标牌发生了什么。':`实验 ${lessonCode()} 已就绪。${level.hints[0]} 一次掌握一个新知识。`;
  document.querySelectorAll('.target-highlight').forEach(el=>el.classList.remove('target-highlight'));
  $('console').replaceChildren();log(`$ ${track==='page'?'dom-lab':language==='js'?'javascript':'rust'} · 实验 ${lessonCode()}`,'command');log('等待运行… 下一行代码，会带来什么变化？','muted');
  code.scrollTop=0;code.scrollLeft=0;resetScene(true);updateSidebar();persist();updateCursor();
  initialized=true;
}
function updateBoard() {
  for (const surface of [document.body, document.querySelector('.topbar')]) {
    const rgb = getComputedStyle(surface).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
    surface.dataset.dark = luminance[0] * .2126 + luminance[1] * .7152 + luminance[2] * .0722 < .179 ? 'true' : 'false';
  }
  const info=getLevelInfo(mapLevel()),count=state.collected.length,total=info.batteries.length;
  renderer.setScene(mapLevel(),state,Math.min(240,450/progress.speed));
  $('board').setAttribute('aria-label',track==='page'?`网页实验 ${lessonNumber()}：${level.name}。B-01 是本关导师。${state.won?'页面目标已完成，机器人正在庆祝。':'按任务指示修改真实网页。'}`:`实验 ${lessonNumber()}：${level.name}。机器人在第 ${state.x+1} 列、第 ${state.y+1} 行，朝${['北','东','南','西'][state.dir]}。已收集 ${count} / ${total} 块能量。${state.won?'已完成实验。':''}`);
  $('energy-count').innerHTML=`${String(count).padStart(2,'0')} <small>/ ${String(total).padStart(2,'0')}</small>`;
  $('energy-dots').replaceChildren();
  for(let i=0;i<total;i++){const dot=document.createElement('i');dot.className=`energy-dot${i<count?' filled':''}`;$('energy-dots').append(dot);}
  $('goal-energy-text').textContent=`收集所有能量（${count} / ${total}）`;
  $('goal-move').classList.toggle('checked',state.steps>0);
  $('goal-energy').classList.toggle('checked',count===total);
  $('goal-exit').classList.toggle('checked',state.x===info.exit.x&&state.y===info.exit.y);
  $('steps-count').textContent=`${state.steps} 条指令`;$('moves-count').textContent=track==='page'?'DOM 已连接':`${state.moves} 次移动`;
  $('position-label').textContent=`B-01 · (${state.x+1}, ${state.y+1}) · 朝${['北','东','南','西'][state.dir]}`;
  const checks=track==='page'?checkPageGoals(level,document):[
    ...(total?[{label:`收集 ${total} 块能量`,passed:count===total}]:[]),
    {label:'到达绿色出口',passed:state.x===info.exit.x&&state.y===info.exit.y}
  ];
  for(const container of [$('task-checklist'),...(track==='page'?[$('web-goals')]:[])]){
    container.replaceChildren();
    checks.forEach(check=>{const li=document.createElement('li');li.className=check.passed?'checked':'';const box=document.createElement('span');box.className='checkbox';const text=document.createElement('span');text.textContent=check.label;li.append(box,text);container.append(li);});
  }
}
const escapeHtml=text=>text.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function colorLine(line) {
  const re=/(\/\/.*$)|\b(fn|main|let|mut|for|in|if|else|i32|usize)\b|\b(\d+)\b|\b([A-Za-z_]\w*)(?=\s*\()|([{}();])/g;
  let output='',last=0;
  for(const match of line.matchAll(re)){
    output+=escapeHtml(line.slice(last,match.index));
    const type=match[1]?'comment':match[2]?'keyword':match[3]?'number':match[4]?'function':'symbol';
    output+=`<span class="syntax-${type}">${escapeHtml(match[0])}</span>`;last=match.index+match[0].length;
  }
  return output+escapeHtml(line.slice(last));
}
function highlightCode() {
  const lines=code.value.split('\n');
  $('highlight').innerHTML=lines.map((text,i)=>`<span class="code-line${i+1===activeLine?' current-code-line':''}">${colorLine(text)||' '}</span>`).join('\n')+'\n';
  $('line-numbers').innerHTML=lines.map((_,i)=>`<div${i+1===activeLine?' class="current"':''}>${i+1}</div>`).join('');
  syncEditorScroll();
}
function syncEditorScroll() { $('highlight').scrollTop=code.scrollTop;$('highlight').scrollLeft=code.scrollLeft;$('line-numbers').scrollTop=code.scrollTop; }
function updateCursor(){const prefix=code.value.slice(0,code.selectionStart).split('\n');$('cursor-position').textContent=`Ln ${prefix.length}, Col ${prefix.at(-1).length+1}`;}
function highlightExecution(line) {
  activeLine=line;highlightCode();
  const top=(line-1)*25;
  if(top<code.scrollTop||top>code.scrollTop+code.clientHeight-45){code.scrollTop=Math.max(0,top-60);syncEditorScroll();}
}
function prepareExecution() {
  cancelExecution();renderer.clearCelebration();restoreEnvironment();state=createState(mapLevel());$('completion').hidden=true;$('console').replaceChildren();saveDraft();
  log(`$ ${track==='page'?'dom-lab':language==='js'?'javascript':'rust'} · 实验 ${lessonCode()}`,'command');
  try{
    queue=track==='page'?compilePageCode(code.value):compile(code.value,language);
    if(queue.length===0){log(track==='page'?'还没有页面操作。试着按本关目标修改一个真实元素。':'还没有可执行的移动指令。试着写下 forward();','muted');setMode('done');updateBoard();return false;}
    log('代码检查通过，B-01 准备执行。','muted');activeLine=0;updateBoard();return true;
  }catch(error){
    queue=null;setMode('error');log(error.message,'error');
    const match=/第\s*(\d+)\s*行/.exec(error.message);if(match)highlightExecution(Number(match[1]));
    updateBoard();tone('error');return false;
  }
}
function finish() {
  clearTimeout(timer);timer=null;
  if(state.won){
    queue=null;setMode('won');
    const first=!completed().includes(level.id);
    if(first)completed().push(level.id);
    persist();updateSidebar();log(track==='page'?`✓ 实验成功！${state.steps} 条 JavaScript 指令改变了真实页面。`:`✓ 实验成功！执行 ${state.steps} 条动作，收集全部 ${state.collected.length} 块能量。`,'success');
    $('completion').hidden=false;
    const all=completed().length===lessons().length;
    $('completion-title').textContent=all?'整条学习路径已完成！':'实验成功，系统已修复。';
    const next=nextLesson();
    $('completion-text').textContent=next?`接下来：${next.name}`:track==='page'&&all?`${PAGE_LEVELS.length} 个网页实验已完成，继续探索机器人路线。`:'本关已完成，继续探索另一条学习路线。';
    $('next-button').textContent=next?`下一关：${next.name} →`:track==='page'?'回到机器人实验 →':'开始改造实验室 →';
    $('next-button').focus({preventScroll:true});
    $('mentor-message').textContent=all?(track==='page'?'整个实验室都焕然一新了！回到机器人路线，继续用代码探索吧。':'所有系统恢复运行！试试另一种语言，看看同一个想法可以怎样表达。'):'漂亮的调试！保存这次理解，下一个实验里我们继续前进。';
    renderer.celebrate();tone('win');
  }else if(state.status==='error'){
    queue=null;setMode('error');log(state.error,'error');log('修改代码后重新运行，或用“单步执行”检查每个动作。','muted');tone('error');
  }else{
    queue=null;setMode('done');
    if(track==='page')log('页面已更新。还有目标未达到，检查任务卡中的勾选状态后再试。','muted');
    else {
      const info=getLevelInfo(level),missing=info.batteries.length-state.collected.length;
      log(`代码已执行完。${missing>0?`还有 ${missing} 块能量未收集。`:'能量已收集完。'}${state.x!==info.exit.x||state.y!==info.exit.y?'继续前进，到达绿色出口。':'收集全部能量后才能完成实验。'}`,'muted');
    }
  }
}
function executeOne() {
  if(!queue||!queue.length){finish();return false;}
  const command=queue.shift();highlightExecution(command.line);
  if(track==='page'){
    try {
      const message=applyPageCommand(command,document);state={...state,steps:state.steps+1};log(`L${command.line}  ${message}`);
      state.won=queue.length===0&&checkPageGoals(level,document).every(check=>check.passed);
      if(state.won)state.status='won';
    } catch(error) { state={...state,status:'error',error:error.message}; }
    updateBoard();
  }else if(command.op==='if'){
    const possible=isPathAhead(level,state);
    log(`L${command.line}  前方${possible?'可通行 → if':'是墙 → else'} 分支`);
    queue.unshift(...(possible?command.then:command.else));
  }else{
    const collected=state.collected.length;
    state=applyCommand(level,state,command);
    if(state.status!=='error')log(`L${command.line}  ${commandLabels[command.op]}${state.collected.length>collected?' · 收集能量 +1':''}`);
    updateBoard();if(state.collected.length>collected)tone('collect');
  }
  if(state.won||state.status==='error'||queue.length===0){finish();return false;}
  return true;
}
function scheduleRun(token) {
  if(token!==generation||mode!=='running')return;
  if(executeOne())timer=setTimeout(()=>scheduleRun(token),560/progress.speed);
}
function run() {
  if(mode==='running'){clearTimeout(timer);timer=null;setMode('paused');log('已暂停。可以继续运行，或单步检查。','muted');return;}
  if(mode!=='paused'||!queue){if(!prepareExecution())return;}
  setMode('running');const token=++generation;scheduleRun(token);
}
function step() {
  if(mode==='running'||mode==='won')return;
  if(mode!=='paused'||!queue){if(!prepareExecution())return;}
  setMode('paused');executeOne();
}
function tone(kind) {
  if(!progress.sound)return;
  try{
    audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
    const notes=kind==='win'?[523,659,784]:kind==='error'?[180]:[660,880];
    notes.forEach((frequency,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime+i*.09;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(.035,time);gain.gain.exponentialRampToValueAtTime(.001,time+.15);osc.connect(gain);gain.connect(audio.destination);osc.start(time);osc.stop(time+.17);});
  }catch{/* Sound is optional when audio is unavailable. */}
}

code.addEventListener('input',()=>{resetScene();saveDraft();updateCursor();});
code.addEventListener('scroll',syncEditorScroll);code.addEventListener('click',updateCursor);code.addEventListener('keyup',updateCursor);
code.addEventListener('keydown',event=>{
  if(event.key==='Escape'){escapeEditor=true;return;}
  if(event.key==='Tab'&&!escapeEditor){event.preventDefault();code.setRangeText('    ',code.selectionStart,code.selectionEnd,'end');code.dispatchEvent(new Event('input'));}
  else escapeEditor=false;
});
$('run-button').addEventListener('click',run);$('step-button').addEventListener('click',step);
$('reset-button').addEventListener('click',()=>{code.value=level.starters[language];resetScene(true);saveDraft();$('console').replaceChildren();log('已恢复本关起始代码与实验室环境，重新出发。','muted');hintIndex=0;solutionButton.hidden=true;$('hint-count').textContent='';$('inline-hint').textContent=level.explanation[language];});
$('hint-button').addEventListener('click',()=>{
  $('inline-hint').textContent=level.hints[Math.min(hintIndex,level.hints.length-1)];hintIndex=Math.min(level.hints.length,hintIndex+1);$('hint-count').textContent=`${hintIndex}/${level.hints.length}`;
  if(hintIndex===level.hints.length)solutionButton.hidden=false;
});
solutionButton.addEventListener('click',()=>{code.value=level.solutions[language];resetScene(true);saveDraft();$('inline-hint').textContent=`参考答案已填入。${level.explanation[language]}`;toast('参考答案已填入，试着单步观察它。');});
$('clear-log').addEventListener('click',()=>$('console').replaceChildren());
$('copy-button').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.value);toast('代码已复制');}catch{code.focus();code.select();toast('已选中代码，请按 Ctrl / ⌘ + C 复制。');}});
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.language!==language)selectLevel(level.id,button.dataset.language);}));
document.querySelectorAll('[data-speed]').forEach(button=>button.addEventListener('click',()=>{progress.speed=Number(button.dataset.speed);updateSpeed();persist();}));
function updateSpeed(){document.querySelectorAll('[data-speed]').forEach(button=>{const active=Number(button.dataset.speed)===progress.speed;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});}
$('next-button').addEventListener('click',()=>{const next=nextLesson();if(next)selectLevel(next.id);else if(track==='robot')selectLevel(PAGE_LEVELS[0].id,'js','page');else selectLevel(LEVELS[0].id,progress.language,'robot');document.querySelector('.mission-intro').scrollIntoView({block:'start',behavior:renderer.reduced?'instant':'smooth'});code.focus({preventScroll:true});});
function updateSound(){const label=progress.sound?'关闭音效':'开启音效';$('sound-button').setAttribute('aria-label',label);$('sound-button').setAttribute('title',label);$('sound-button').setAttribute('aria-pressed',progress.sound);$('sound-icon').style.color=progress.sound?'var(--mint)':'var(--muted)';}
$('sound-button').addEventListener('click',()=>{progress.sound=!progress.sound;updateSound();persist();tone('collect');toast(progress.sound?'音效已开启':'音效已关闭');});
const manual=$('manual-dialog');
manual.querySelector('.manual-content > p').textContent=`欢迎来到代码实验室。机器人路线有 ${LEVELS.length} 个循序渐进的实验；改造实验室路线有 ${PAGE_LEVELS.length} 个 JavaScript 趣味实验，打开星空、体验失重、让机器人跳舞。两条路线分别保存成绩和草稿。`;
const pageGuide=document.createElement('section');pageGuide.className='web-manual';
pageGuide.innerHTML=`<h3>让真实网页成为实验室</h3><p>点击顶部“改造实验室”。代码会改变真实页面和机器人的状态；切关、切换路线或重置后恢复本关初始环境。通关后，“下一关”固定显示在屏幕底部，也可以直接按 Enter 继续。</p><table><thead><tr><th>目标</th><th>支持的 JavaScript 示例</th></tr></thead><tbody><tr><td>顶部名称</td><td><code>document.querySelector('#lab-title').textContent = '星际实验室';</code></td></tr><tr><td>标题颜色</td><td><code>document.querySelector('#lab-title').style.color = '#f6c65c';</code></td></tr><tr><td>整页墙面 / 顶部控制台</td><td><code>document.body.style.backgroundColor = '#142b3b';</code><br><code>document.querySelector('.topbar').style.backgroundColor = '#102b30';</code></td></tr><tr><td>整页强调色</td><td><code>document.documentElement.style.setProperty('--lab-accent', '#8bb8ff');</code></td></tr><tr><td>环境灯</td><td><code>document.querySelector('#lab-beacon').classList.add('on');</code></td></tr><tr><td>星空 / 机器人失重 / 跳舞</td><td><code>document.body.classList.add('starfield');</code><br><code>document.body.classList.add('zero-gravity');</code><br><code>document.body.classList.add('dance-mode');</code></td></tr><tr><td>恢复场景</td><td><code>document.body.classList.remove('dance-mode');</code></td></tr></tbody></table><p class="manual-note">场景类名还包括 blueprint（蓝图）、hologram（全息）、scan-mode（扫描）、mirror-world（镜像）、night-shift（夜航）、party-mode（派对）。网页路线只支持这些指定目标、API、字符串常量和单行注释；颜色接受 3 / 6 位十六进制，文字最多 80 字，每次最多 64 条操作。代码先完整检查再修改页面，不支持任意脚本。机器人路线继续支持其变量、循环与条件语法。</p>`;
manual.querySelector('.manual-content').insertBefore(pageGuide,manual.querySelector('.manual-content > h3'));
function showManual(){if(mode==='running')run();manual.showModal();}
$('manual-button').addEventListener('click',showManual);$('syntax-button').addEventListener('click',showManual);
$('lab-tab').addEventListener('click',()=>{if(manual.open)manual.close();if(track!=='robot')selectLevel(progress.levelId,progress.language,'robot');code.focus();});
$('page-tab').addEventListener('click',()=>{if(manual.open)manual.close();if(track!=='page')selectLevel(progress.pageLevelId,'js','page');code.focus();});
$('close-manual').addEventListener('click',()=>manual.close());$('manual-start').addEventListener('click',()=>{manual.close();code.focus();});
manual.addEventListener('click',event=>{if(event.target===manual){const box=manual.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)manual.close();}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!manual.open&&!$('tour-dialog').open){event.preventDefault();run();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running')run();});

updateSpeed();updateSound();selectLevel(level.id,language);
initTour({storage:store,onStart(){if(manual.open)manual.close();if(mode==='running')run();}});
try{
  const response=await fetch('./engine.wasm');if(!response.ok)throw new Error('规则模块不可用');
  const {instance}=await WebAssembly.instantiate(await response.arrayBuffer());attachRules(instance.exports);
  $('engine-label').textContent='Rust 引擎在线';$('engine-label').title='真实 Rust 编译的 WebAssembly：移动、碰撞、转向、通关判定';
  document.documentElement.dataset.engine='rust-wasm';
}catch(error){$('engine-label').textContent='JS 兼容引擎';$('engine-label').title='Rust 模块加载失败，使用相同的 JavaScript 规则';document.documentElement.dataset.engine='js-fallback';log('Rust 模块暂时不可用，已使用 JavaScript 兼容规则。通过本地启动器打开可加载完整模块。','muted');}
