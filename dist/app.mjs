import { LEVELS } from './levels.mjs';
import { compile, createState, applyCommand, isPathAhead, getLevelInfo, attachRules } from './core.mjs';
import { loadProgress, saveProgress } from './progress.mjs';
import { LabRenderer } from './renderer.mjs';

const $ = id => document.getElementById(id);
let store;
try { store = localStorage; } catch { store = { getItem: () => null, setItem() { throw new Error('blocked'); } }; }
const progress = loadProgress(store);
let level = LEVELS.find(item => item.id === progress.levelId) || LEVELS[0];
let language = progress.language;
let state = createState(level);
let mode = 'idle', queue = null, timer = null, generation = 0, activeLine = 0, hintIndex = 0, toastTimer, audio;
let escapeEditor = false;
let initialized = false;
const code = $('code');
const renderer = new LabRenderer($('board'));
const titleOverrides = { 1: '让第一行代码动起来' };
const commandLabels = { forward: '前进一步', left: '向左转 90°', right: '向右转 90°' };
const solutionButton = document.createElement('button');
solutionButton.id = 'solution-button';solutionButton.className = 'solution-button';solutionButton.textContent = '查看参考答案';solutionButton.hidden = true;
document.querySelector('.hint-strip').append(solutionButton);

function persist() {
  progress.language = language;progress.levelId = level.id;
  saveProgress(store, progress);
}
function saveDraft() { progress.drafts[`${language}:${level.id}`] = code.value; persist(); }
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
function resetScene() {
  cancelExecution();state=createState(level);activeLine=0;setMode('idle');$('completion').hidden=true;
  updateBoard();highlightCode();
}
function updateSidebar() {
  $('mission-list').replaceChildren();
  LEVELS.forEach(item=>{
    const done=progress.completed[language].includes(item.id), button=document.createElement('button');
    button.className=`mission-button${item.id===level.id?' active':''}${done?' done':''}`;
    button.dataset.level=item.id;button.setAttribute('aria-current',item.id===level.id?'step':'false');
    button.setAttribute('aria-label',`实验 ${item.id} ${item.name}${done?'，已完成':''}`);
    const num=document.createElement('span');num.className='number';num.textContent=String(item.id).padStart(2,'0');
    const name=document.createElement('span');name.textContent=item.name;
    const mark=document.createElement('span');mark.className='mission-mark';mark.textContent=item.id===level.id?'›':done?'✓':'·';
    button.append(num,name,mark);button.addEventListener('click',()=>selectLevel(item.id));$('mission-list').append(button);
  });
  const count=progress.completed[language].length;
  $('progress-language').textContent=`${language==='js'?'JavaScript':'Rust'} 进度`;
  $('progress-count').innerHTML=`${count} <span>/ 6</span>`;
  $('progress-fill').style.width=`${count/6*100}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow',count);
}
function selectLevel(id,newLanguage=language) {
  if(initialized)saveDraft();cancelExecution();
  level=LEVELS.find(item=>item.id===id)||LEVELS[0];language=newLanguage;hintIndex=0;
  code.value=progress.drafts[`${language}:${level.id}`]??level.starters[language];
  $('breadcrumb').textContent=`实验 ${String(level.id).padStart(2,'0')} / ${level.concept}`;
  $('mission-title').textContent=titleOverrides[level.id]||level.title;
  $('mission-objective').textContent=level.objective;
  $('concept-tags').replaceChildren();
  const tags=level.concept.split(/[、与]/).filter(Boolean);tags.push(language==='js'?'JavaScript':'Rust');
  tags.forEach(text=>{const tag=document.createElement('span');tag.className='tag';tag.textContent=text;$('concept-tags').append(tag);});
  document.querySelectorAll('[data-language]').forEach(button=>{const active=button.dataset.language===language;button.classList.toggle('active',active);button.setAttribute('aria-selected',active);});
  $('filename').textContent=`mission_${String(level.id).padStart(2,'0')}.${language==='js'?'js':'rs'}`;
  $('editor-language').textContent=language==='js'?'JAVASCRIPT':'RUST';
  $('board-number').textContent=String(level.id).padStart(2,'0');$('board-title').textContent=level.name;$('sector').textContent=String(level.id).padStart(2,'0');
  const info=getLevelInfo(level);$('grid-size').textContent=`${info.width} × ${info.height} GRID`;
  $('inline-hint').textContent=level.explanation[language];$('hint-count').textContent='';solutionButton.hidden=true;
  $('mentor-message').textContent=level.id===1?'你好，未来的开发者！我是 B-01。用你的第一行代码，唤醒这间实验室吧。':`实验 ${String(level.id).padStart(2,'0')} 已就绪。${level.hints[0]} 试着先自己运行一次吧。`;
  $('console').replaceChildren();log(`$ ${language==='js'?'javascript':'rust'} mission_${String(level.id).padStart(2,'0')}.${language==='js'?'js':'rs'}`,'command');log('等待运行… 你的下一行代码，会带我去哪？','muted');
  code.scrollTop=0;code.scrollLeft=0;resetScene();updateSidebar();persist();updateCursor();
  initialized=true;
}
function updateBoard() {
  const info=getLevelInfo(level),count=state.collected.length,total=info.batteries.length;
  renderer.setScene(level,state,Math.min(240,450/progress.speed));
  $('energy-count').innerHTML=`${String(count).padStart(2,'0')} <small>/ ${String(total).padStart(2,'0')}</small>`;
  $('energy-dots').replaceChildren();
  for(let i=0;i<total;i++){const dot=document.createElement('i');dot.className=`energy-dot${i<count?' filled':''}`;$('energy-dots').append(dot);}
  $('goal-energy-text').textContent=`收集所有能量（${count} / ${total}）`;
  $('goal-move').classList.toggle('checked',state.steps>0);
  $('goal-energy').classList.toggle('checked',count===total);
  $('goal-exit').classList.toggle('checked',state.x===info.exit.x&&state.y===info.exit.y);
  $('steps-count').textContent=`${state.steps} 条指令`;$('moves-count').textContent=`${state.moves} 次移动`;
  $('position-label').textContent=`B-01 · (${state.x+1}, ${state.y+1}) · 朝${['北','东','南','西'][state.dir]}`;
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
  cancelExecution();state=createState(level);$('completion').hidden=true;$('console').replaceChildren();saveDraft();
  log(`$ ${language==='js'?'javascript':'rust'} · 实验 ${String(level.id).padStart(2,'0')}`,'command');
  try{
    queue=compile(code.value,language);
    if(queue.length===0){log('还没有可执行的移动指令。试着写下 forward();','muted');setMode('done');updateBoard();return false;}
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
    const first=!progress.completed[language].includes(level.id);
    if(first)progress.completed[language].push(level.id);
    persist();updateSidebar();log(`✓ 实验成功！执行 ${state.steps} 条动作，收集全部 ${state.collected.length} 块能量。`,'success');
    $('completion').hidden=false;
    const all=progress.completed[language].length===6;
    $('completion-title').textContent=all?'整条学习路径已完成！':'实验成功，系统已修复。';
    $('completion-text').textContent=level.explanation[language];
    $('next-button').textContent=level.id<6?'下一个实验 →':progress.completed[language==='js'?'rust':'js'].length<6?'挑战另一种语言 →':'回到第一个实验 →';
    $('mentor-message').textContent=all?'所有系统恢复运行！试试另一种语言，看看同一个想法可以怎样表达。':'漂亮的调试！保存这次理解，下一个实验里我们继续前进。';
    tone('win');
  }else if(state.status==='error'){
    queue=null;setMode('error');log(state.error,'error');log('修改代码后重新运行，或用“单步执行”检查每个动作。','muted');tone('error');
  }else{
    queue=null;setMode('done');
    const info=getLevelInfo(level),missing=info.batteries.length-state.collected.length;
    log(`代码已执行完。${missing>0?`还有 ${missing} 块能量未收集。`:'能量已收集完。'}${state.x!==info.exit.x||state.y!==info.exit.y?'继续前进，到达绿色出口。':'收集全部能量后才能完成实验。'}`,'muted');
  }
}
function executeOne() {
  if(!queue||!queue.length){finish();return false;}
  const command=queue.shift();highlightExecution(command.line);
  if(command.op==='if'){
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
$('reset-button').addEventListener('click',()=>{code.value=level.starters[language];resetScene();saveDraft();$('console').replaceChildren();log('已恢复本关起始代码，重新出发。','muted');hintIndex=0;solutionButton.hidden=true;$('hint-count').textContent='';$('inline-hint').textContent=level.explanation[language];});
$('hint-button').addEventListener('click',()=>{
  $('inline-hint').textContent=level.hints[Math.min(hintIndex,level.hints.length-1)];hintIndex=Math.min(level.hints.length,hintIndex+1);$('hint-count').textContent=`${hintIndex}/${level.hints.length}`;
  if(hintIndex===level.hints.length)solutionButton.hidden=false;
});
solutionButton.addEventListener('click',()=>{code.value=level.solutions[language];resetScene();saveDraft();$('inline-hint').textContent=`参考答案已填入。${level.explanation[language]}`;toast('参考答案已填入，试着单步观察它。');});
$('clear-log').addEventListener('click',()=>$('console').replaceChildren());
$('copy-button').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.value);toast('代码已复制');}catch{code.focus();code.select();toast('已选中代码，请按 Ctrl / ⌘ + C 复制。');}});
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.language!==language)selectLevel(level.id,button.dataset.language);}));
document.querySelectorAll('[data-speed]').forEach(button=>button.addEventListener('click',()=>{progress.speed=Number(button.dataset.speed);updateSpeed();persist();}));
function updateSpeed(){document.querySelectorAll('[data-speed]').forEach(button=>{const active=Number(button.dataset.speed)===progress.speed;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});}
$('next-button').addEventListener('click',()=>{if(level.id<6)selectLevel(level.id+1);else selectLevel(1,progress.completed[language==='js'?'rust':'js'].length<6?(language==='js'?'rust':'js'):language);document.querySelector('.mission-intro').scrollIntoView({block:'start',behavior:renderer.reduced?'instant':'smooth'});});
function updateSound(){const label=progress.sound?'关闭音效':'开启音效';$('sound-button').setAttribute('aria-label',label);$('sound-button').setAttribute('title',label);$('sound-button').setAttribute('aria-pressed',progress.sound);$('sound-icon').style.color=progress.sound?'var(--mint)':'var(--muted)';}
$('sound-button').addEventListener('click',()=>{progress.sound=!progress.sound;updateSound();persist();tone('collect');toast(progress.sound?'音效已开启':'音效已关闭');});
const manual=$('manual-dialog');
function showManual(){if(mode==='running')run();manual.showModal();}
$('manual-button').addEventListener('click',showManual);$('syntax-button').addEventListener('click',showManual);
$('lab-tab').addEventListener('click',()=>{if(manual.open)manual.close();code.focus();});
$('close-manual').addEventListener('click',()=>manual.close());$('manual-start').addEventListener('click',()=>{manual.close();code.focus();});
manual.addEventListener('click',event=>{if(event.target===manual){const box=manual.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)manual.close();}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!manual.open){event.preventDefault();run();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running')run();});

updateSpeed();updateSound();selectLevel(level.id,language);
try{
  const response=await fetch('./engine.wasm');if(!response.ok)throw new Error('规则模块不可用');
  const {instance}=await WebAssembly.instantiate(await response.arrayBuffer());attachRules(instance.exports);
  $('engine-label').textContent='Rust 引擎在线';$('engine-label').title='真实 Rust 编译的 WebAssembly：移动、碰撞、转向、通关判定';
  document.documentElement.dataset.engine='rust-wasm';
}catch(error){$('engine-label').textContent='JS 兼容引擎';$('engine-label').title='Rust 模块加载失败，使用相同的 JavaScript 规则';document.documentElement.dataset.engine='js-fallback';log('Rust 模块暂时不可用，已使用 JavaScript 兼容规则。通过本地启动器打开可加载完整模块。','muted');}
