import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const artifacts=path.join(root,'artifacts');await mkdir(artifacts,{recursive:true});
const browser=process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port=9337;
const child=spawn(browser,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(root,'tools','qa-edge-profile')}`,'--no-first-run','--no-default-browser-check','--disable-gpu','--hide-scrollbars','about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;
try{
  let targets;
  for(let i=0;i<80;i++){try{targets=await(await fetch(`http://localhost:${port}/json`)).json();if(targets.some(t=>t.type==='page'))break;}catch{}await sleep(150);}
  const target=targets?.find(t=>t.type==='page');if(!target)throw new Error('Edge did not start');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const request=pending.get(message.id);if(request){clearTimeout(request.timer);pending.delete(message.id);message.error?request.reject(new Error(JSON.stringify(message.error))):request.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description||''));};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const callId=++id,timer=setTimeout(()=>{pending.delete(callId);reject(new Error(`CDP timeout: ${method}`));},20000);pending.set(callId,{resolve,reject,timer});ws.send(JSON.stringify({id:callId,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const waitFor=async(expression,timeout=12000)=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timed out: '+expression);};
  const reloadPage=async()=>{await evaluate("document.documentElement.dataset.qaReload='pending'");await send('Page.reload');await sleep(100);await waitFor("document.documentElement.dataset.qaReload!=='pending'&&document.documentElement.dataset.engine==='rust-wasm'");};
  const screenshot=async(name,fullPage=true)=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:fullPage});await writeFile(path.join(artifacts,name),Buffer.from(shot.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://localhost:4173'});
  await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
  await evaluate("localStorage.clear()");await reloadPage();
  const tourOpen = "document.getElementById('tour-dialog').open";
  assert.equal(await evaluate(tourOpen),true);
  assert.equal(await evaluate("document.getElementById('tour-dialog').dataset.step"),'1');
  assert.equal(await evaluate("document.getElementById('tour-back').disabled"),true);
  await screenshot('tour-desktop.png',false);
  const nextPoint=await evaluate("(()=>{const r=document.getElementById('tour-next').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...nextPoint,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...nextPoint,button:'left',clickCount:1});
  assert.equal(await evaluate("document.getElementById('tour-dialog').dataset.step"),'2');
  await evaluate("document.getElementById('tour-back').click()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers:2});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers:2});
  assert.match(await evaluate("document.getElementById('steps-count').textContent"),/^0 条/);
  assert.equal(await evaluate("document.getElementById('board-badge').classList.contains('running')"),false);
  await evaluate("document.getElementById('tour-next').click();document.getElementById('tour-back').click()");
  assert.equal(await evaluate("document.getElementById('tour-dialog').dataset.step"),'1');
  // Verify every real target, the transparent cutout and the card on narrow and wide screens.
  for(const [width,height] of [[320,740],[390,844],[768,1024],[1024,768],[1440,1000]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    await waitFor(`document.querySelector('.tour-mask').getAttribute('viewBox')==='0 0 ${width} ${height}'`);
    for(let step=1;step<=11;step++){
      await sleep(30);
      const geometry=await evaluate("(()=>{const d=document.getElementById('tour-dialog'),r=document.querySelector(d.dataset.target).getBoundingClientRect(),s=document.getElementById('tour-spotlight').getBoundingClientRect(),c=document.getElementById('tour-card').getBoundingClientRect(),rect=x=>({left:x.left,top:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height});return {step:+d.dataset.step,target:rect(r),spot:rect(s),card:rect(c),width:innerWidth,height:innerHeight,focus:d.contains(document.activeElement),cutout:document.getElementById('tour-shade').getAttribute('d'),evenodd:document.getElementById('tour-shade').getAttribute('fill-rule')}})()");
      assert.equal(geometry.step,step);assert.equal(geometry.focus,true);assert.equal(geometry.evenodd,'evenodd');assert.match(geometry.cutout,/Z M/);
      const {target:t,spot:s,card:c}=geometry;
      assert.ok(c.left>=11&&c.top>=11&&c.right<=width-11&&c.bottom<=height-11,JSON.stringify({width,step,...geometry}));
      assert.ok(s.width>0&&s.height>0&&s.left>=0&&s.top>=0&&s.right<=width&&s.bottom<=height,JSON.stringify(geometry));
      assert.ok(Math.abs(s.left-Math.max(4,t.left-6))<1&&Math.abs(s.top-Math.max(4,t.top-6))<1,JSON.stringify(geometry));
      const overlap=Math.max(0,Math.min(c.right,s.right)-Math.max(c.left,s.left))*Math.max(0,Math.min(c.bottom,s.bottom)-Math.max(c.top,s.top));
      assert.equal(overlap,0,JSON.stringify({width,step,...geometry}));
      if(width===390&&step===7)await screenshot('tour-mobile.png',false);
      if(width===1440&&step===7)await screenshot('tour-board.png',false);
      await evaluate("document.getElementById('tour-next').click()");
    }
    assert.equal(await evaluate(tourOpen),false);
    await waitFor("localStorage.getItem('code-lab-tour-v1')==='seen'");
    assert.equal(await evaluate("localStorage.getItem('code-lab-tour-v1')"),'seen');
    if(width!==1440)await evaluate("document.getElementById('tour-button').click()");
  }
  await reloadPage();assert.equal(await evaluate(tourOpen),false);
  const launcher=await evaluate("(()=>{const r=document.getElementById('tour-button').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...launcher,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...launcher,button:'left',clickCount:1});
  assert.equal(await evaluate(tourOpen),true);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:1});
  assert.equal(await evaluate("document.getElementById('tour-dialog').contains(document.activeElement)"),true);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate(tourOpen),false);
  await sleep(50);
  assert.equal(await evaluate("document.activeElement.id"),'tour-button');
  console.log('PASS: first-visit 11-step guide, cutout placement on five widths, no target overlap, persistence, replay, keyboard and focus');
  await sleep(400);await screenshot('desktop.png');
  console.log('PASS: initial desktop, actual Rust Wasm loaded');
  for (const [width,height] of [[320,740],[390,844],[768,1024],[1024,768],[1366,768],[1440,1000]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    await sleep(80);
    const layout=await evaluate("(()=>{const code=document.getElementById('code'),pre=document.getElementById('highlight'),a=getComputedStyle(code),b=getComputedStyle(pre),r=document.getElementById('run-button').getBoundingClientRect();return {scroll:document.documentElement.scrollWidth,width:innerWidth,overflow:[...document.querySelectorAll('.topbar,.header-tools,.editor-actions,.playback-bar,.speed-control,#run-button')].map(el=>({name:el.id||el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})),aligned:['fontFamily','fontSize','lineHeight','padding'].every(key=>a[key]===b[key]),runBottom:r.bottom,runWidth:r.width,runHeight:r.height}})()");
    assert.ok(layout.scroll<=width,JSON.stringify({width,...layout}));assert.equal(layout.aligned,true);
    const navCenter=await evaluate("(()=>{const r=document.querySelector('.topnav').getBoundingClientRect();return (r.left+r.right)/2})()");
    assert.ok(Math.abs(navCenter-width/2)<=1,JSON.stringify({width,navCenter}));
    assert.ok(layout.runWidth>=120&&layout.runHeight>=40,JSON.stringify(layout));
    if(width>=1024)assert.ok(layout.runBottom<=height,JSON.stringify({width,height,...layout}));
    if(width===1366)await screenshot('desktop-1366.png');
    if(width===768)await screenshot('tablet.png');
  }
  await evaluate("document.querySelector('.lesson-details summary').click()");
  assert.equal(await evaluate("document.querySelector('.lesson-details').open"),true);
  await evaluate("document.querySelector('.lesson-details summary').click()");
  assert.equal(await evaluate("document.querySelector('.lesson-details').open"),false);
  console.log('PASS: six responsive widths, short-screen run action, aligned editor, native lesson disclosure');
  assert.match(await evaluate("document.getElementById('board').getAttribute('aria-label')"),/^实验 1：/);
  const setCode=async(value)=>evaluate(`(() => {const el=document.getElementById('code');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input'));return true;})()`);
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const text=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
  const levels=await evaluate("import('./levels.mjs').then(m=>m.LEVELS)");
  const pages=await evaluate("import('./page-lab.mjs').then(m=>m.PAGE_LEVELS)");
  const bodyClasses=await evaluate("import('./page-lab.mjs').then(m=>m.BODY_CLASSES)");
  assert.equal(await evaluate("document.getElementById('lab-poster')"),null);
  const assertNextVisible=async()=>{
    await waitFor("getComputedStyle(document.getElementById('completion')).opacity === '1'");
    const button=await evaluate("(()=>{const b=document.getElementById('next-button'),r=b.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,w:innerWidth,h:innerHeight,focused:document.activeElement===b,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('#next-button')===b}})()");
    assert.ok(button.top>=0&&button.bottom<=button.h&&button.left>=0&&button.right<=button.w,JSON.stringify(button));
    assert.ok(button.width>=200&&button.height>=44,JSON.stringify(button));
    assert.equal(button.hit,true);
    return button;
  };
  const originalFirst=levels.find(level=>level.id===1),originalCorner=levels.find(level=>level.id===2);
  await evaluate(`localStorage.setItem('code-lab-progress-v1',JSON.stringify({language:'js',levelId:1,completed:{js:[1,2,3,4,5,6],rust:[2]},drafts:{'js:1':'// 旧版本草稿\\nforward();'}}))`);await reloadPage();
  assert.match(await text('progress-count'),/6.*18/s);assert.match(await evaluate("document.getElementById('code').value"),/旧版本草稿/);
  assert.equal(await evaluate("document.querySelector('[data-level=\"1\"] .number').textContent"),'03');
  await evaluate("localStorage.clear();localStorage.setItem('code-lab-tour-v1','seen')");await reloadPage();
  console.log('PASS: old six-lesson progress and draft identities preserved');
  const oldPageDraft=pages.find(page=>page.id===6).solutions.js+"\ndocument.querySelector('#lab-poster').textContent = '探索，从这一行代码开始。';";
  await evaluate(`localStorage.setItem('code-lab-progress-v1',JSON.stringify({track:'page',pageLevelId:6,pageCompleted:[1,2,3,4,5,6],drafts:{'page:6':${JSON.stringify(oldPageDraft)}}}))`);await reloadPage();
  assert.ok(!(await evaluate("document.getElementById('code').value")).includes('#lab-poster'));
  await click('[data-speed="4"]');await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
  assert.ok(!(await text('completion-text')).includes('18 个网页实验已完成'));
  assert.match(await text('next-button'),/海底控制室/);await click('#next-button');assert.match(await text('filename'),/web_06/);
  console.log('PASS: migrated page progress retires generated poster code and continues unfinished lessons');
  await click('#lab-tab');await click(`[data-level="${levels[0].id}"]`);
  // A draft should survive a real reload, not merely an in-memory switch.
  await setCode('// 保存我的草稿\nforward();\nforward();');
  await reloadPage();
  assert.ok((await evaluate("document.getElementById('code').value")).includes('保存我的草稿'));
  console.log('PASS: draft survives reload');
  for(const language of ['js','rust']){
    await click(`[data-language="${language}"]`);await click('[data-speed="4"]');
    for(const level of levels){
      await click(`[data-level="${level.id}"]`);await setCode(level.solutions[language]);await click('#run-button');
      await waitFor("!document.getElementById('completion').hidden",15000);
      assert.match(await text('board-badge'),/实验完成/);
      if(level.id===5){assert.match(await text('console'),/if 分支/);assert.match(await text('console'),/else 分支/);}
      console.log(`PASS: ${language} mission ${level.id}`);
    }
    const saved=await evaluate("JSON.parse(localStorage.getItem('code-lab-progress-v1'))");
    assert.equal(saved.completed[language].length,levels.length);
  }
  await sleep(450);await screenshot('completed.png');
  assert.equal(await evaluate("document.getElementById('board').dataset.celebrating"),'true');
  console.log('PASS: robot celebrates on real completion');
  await assertNextVisible();
  await click('[data-language="js"]');await click('[data-level="1"]');
  await setCode(originalFirst.solutions.js);await click('#step-button');
  assert.equal(await evaluate("document.getElementById('board').dataset.celebrating"),'false');
  assert.match(await text('steps-count'),/^1 条/);assert.match(await text('board-badge'),/暂停/);
  await click('#step-button');assert.match(await text('steps-count'),/^2 条/);
  console.log('PASS: single-step advances exactly one command');
  await click('[data-level="2"]');await setCode(originalCorner.solutions.js);await click('[data-speed="0.5"]');await click('#run-button');await click('#tour-button');
  assert.equal(await evaluate(tourOpen),true);assert.equal(await evaluate("document.getElementById('board-badge').classList.contains('paused')"),true);
  const paused=await text('steps-count');await sleep(700);assert.equal(await text('steps-count'),paused);
  await click('#tour-close');await waitFor("document.activeElement.id!=='tour-next'");
  assert.equal(await evaluate("document.getElementById('code').value"),originalCorner.solutions.js);
  await click('#reset-button');await sleep(700);assert.match(await text('steps-count'),/^0 条/);
  console.log('PASS: pause and reset cancel scheduled execution');
  await setCode('turnLeft();\nforward();\nforward();\nforward();\nforward();\nforward();');await click('[data-speed="4"]');await click('#run-button');await waitFor("document.getElementById('board-badge').classList.contains('error')");assert.match(await text('console'),/前方是墙/);
  await setCode('while (true) { forward(); }');await click('#run-button');assert.match(await text('console'),/暂不支持/);
  console.log('PASS: collision and unsupported code report errors without hanging');
  await click('#page-tab');assert.equal(await evaluate('document.documentElement.dataset.track'),'page');
  assert.match(await evaluate("document.getElementById('board').getAttribute('aria-label')"),/^网页实验/);
  assert.equal(await evaluate("document.getElementById('tab-rust').disabled"),true);
  for(const page of pages){
    await click(`[data-level="${page.id}"]`);
    assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'CODE LAB.');
    assert.equal(await evaluate("document.body.style.backgroundColor"),'');
    assert.equal(await evaluate("document.documentElement.style.getPropertyValue('--lab-accent')"),'');
    assert.equal(await evaluate("document.getElementById('lab-beacon').classList.contains('on')"),false);
    if(!page.setupCode)assert.deepEqual(await evaluate(`(${JSON.stringify(bodyClasses)}).filter(name=>document.body.classList.contains(name))`),[]);
    if(page.id===17){assert.equal(await evaluate("document.body.classList.contains('party-mode')&&document.body.classList.contains('dance-mode')"),true);}
    await setCode(page.solutions.js);await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
    const checks=await evaluate(`import('./page-lab.mjs').then(m=>m.checkPageGoals(m.PAGE_LEVELS.find(x=>x.id===${page.id}),document))`);
    assert.ok(checks.every(check=>check.passed));
    const contrast=await evaluate("(()=>{const linear=value=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4},luminance=color=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const [r,g,b]=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(linear);return .2126*r+.7152*g+.0722*b},ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)},top=document.querySelector('.topbar');return {objective:ratio(getComputedStyle(document.querySelector('.objective')).color,getComputedStyle(document.body).backgroundColor),navigation:ratio(getComputedStyle(document.querySelector('.nav-button.selected')).color,getComputedStyle(top).backgroundColor),primary:[document.getElementById('run-button'),document.getElementById('next-button')].map(el=>ratio(getComputedStyle(el).color,getComputedStyle(el).backgroundColor)),title:ratio(getComputedStyle(document.getElementById('lab-title')).color,document.getElementById('lab-title').style.color?getComputedStyle(document.getElementById('lab-title')).backgroundColor:getComputedStyle(top).backgroundColor)}})()");
    assert.ok(contrast.objective>=4.5&&contrast.navigation>=4.5&&contrast.title>=4.5&&contrast.primary.every(value=>value>=4.5),JSON.stringify({page:page.id,...contrast}));
    assert.equal(await evaluate("document.getElementById('board').dataset.celebrating"),'true');
    const nextRect=await assertNextVisible();assert.equal(nextRect.focused,true);
    if(page.id===8||page.id===11||page.id===12||page.id===16||page.id===18){await sleep(420);await screenshot(`fun-lab-${page.id}.png`);}
    if(page.id===14)assert.match(await evaluate("getComputedStyle(document.getElementById('board')).transform"),/matrix\(-1/);
    if(page.id===18)assert.match(await evaluate("document.getElementById('board').dataset.environment"),/zero-gravity/);
    console.log(`PASS: real webpage experiment ${page.id}, all DOM goals met`);
    if(page.id===1){
      const x=nextRect.left+nextRect.width/2,y=nextRect.top+nextRect.height/2;
      await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
      assert.match(await text('filename'),/web_02/);
      assert.equal(await evaluate("document.getElementById('completion').hidden"),true);
      console.log('PASS: visible fixed next button works by actual pointer click');
    }
  }
  await sleep(450);await screenshot('web-lab-complete.png');
  assert.deepEqual((await evaluate("JSON.parse(localStorage.getItem('code-lab-progress-v1')).pageCompleted")).sort((a,b)=>a-b),pages.map(page=>page.id).sort((a,b)=>a-b));
  await click('#next-button');assert.equal(await evaluate('document.documentElement.dataset.track'),'robot');
  assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'CODE LAB.');
  assert.equal(await evaluate("document.body.style.backgroundColor"),'');
  assert.equal(await evaluate("document.getElementById('board').dataset.celebrating"),'false');
  assert.deepEqual(await evaluate(`(${JSON.stringify(bodyClasses)}).filter(name=>document.body.classList.contains(name))`),[]);
  await click('#page-tab');await click('[data-level="1"]');
  await setCode("document.querySelector('#lab-title').textContent = '不应执行'; alert('blocked');");await click('#run-button');
  assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'CODE LAB.');assert.match(await text('console'),/需要 document/);
  await setCode(pages[0].solutions.js);await click('#step-button');assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'星际实验室');
  await click('#reset-button');assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'CODE LAB.');
  await click('#lab-tab');
  console.log('PASS: page/track/reset clear effects and celebration, invalid code has no partial effects');
  await click('#manual-button');assert.equal(await evaluate("document.getElementById('manual-dialog').open"),true);await screenshot('manual.png');await click('#tour-button');
  assert.equal(await evaluate("document.getElementById('manual-dialog').open"),false);assert.equal(await evaluate(tourOpen),true);await click('#tour-close');await sleep(50);
  await click('#page-tab');await click('[data-level="8"]');await setCode(pages.find(page=>page.id===8).solutions.js);await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
  await click('#tour-button');for(let i=0;i<2;i++)await click('#tour-next');
  assert.equal(await evaluate("document.documentElement.dataset.track"),'page');assert.equal(await evaluate("document.getElementById('tab-rust').disabled"),true);
  assert.equal(await evaluate("getComputedStyle(document.getElementById('tour-back')).color"),'rgb(85, 100, 84)');
  assert.equal(await evaluate("(()=>{const b=document.getElementById('tour-next'),r=b.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===b})()"),true);
  await screenshot('tour-dark-web.png',false);await click('#tour-close');await sleep(50);await click('#lab-tab');
  console.log('PASS: guide pauses execution, keeps drafts, closes manual and stays readable above dark webpage and completion');
  await click('[data-level="1"]');await click('#reset-button');await setCode('// <img src=x onerror=alert(1)>\nforward();');assert.equal(await evaluate("document.querySelectorAll('.editor-surface img').length"),0);
  await click('#reset-button');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);
  const mobileSize=await evaluate('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,inner:window.innerWidth})');
  assert.ok(mobileSize.scroll<=390,JSON.stringify(mobileSize));
  await screenshot('mobile.png');
  await click('#page-tab');await click('[data-level="6"]');await sleep(150);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=390'));
  await screenshot('mobile-web.png');
  for(const width of [320,390]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    await click('[data-level="5"]');await setCode(pages.find(page=>page.id===5).solutions.js);await click('#run-button');
    await waitFor("!document.getElementById('completion').hidden");
    const beacon=await evaluate("(()=>{const b=document.getElementById('lab-beacon'),r=b.getBoundingClientRect();return {width:r.width,height:r.height,on:b.classList.contains('on'),scroll:document.documentElement.scrollWidth,view:innerWidth}})()");
    assert.ok(beacon.width>0&&beacon.height>0&&beacon.on&&beacon.scroll<=width,JSON.stringify(beacon));
  }
  await click('#lab-tab');
  await click('#page-tab');await click('[data-level="8"]');await setCode(pages.find(page=>page.id===8).solutions.js);await click('#run-button');await waitFor("!document.getElementById('completion').hidden");await sleep(100);
  const mobileNext=await assertNextVisible();
  assert.equal(mobileNext.focused,true);
  await screenshot('mobile-next.png');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'char',text:'\r',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.match(await text('filename'),/web_08/);assert.equal(await evaluate("document.getElementById('completion').hidden"),true);
  console.log('PASS: mobile next button is on screen and Enter advances to next lesson');
  await click('#lab-tab');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await reloadPage();
  await click(`[data-level="${levels[0].id}"]`);await setCode(levels[0].solutions.js);await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
  console.log('PASS: reduced-motion mode remains playable');
  console.log('PASS: manual, escaped editor content, 390px mobile layout');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"Storage.prototype.getItem=function(){throw new Error('blocked')};Storage.prototype.setItem=function(){throw new Error('blocked')};"});
  await reloadPage();
  assert.equal(await evaluate(tourOpen),true);await evaluate("document.getElementById('tour-close').click()");
  await setCode(levels[0].solutions.js);await click('[data-speed="4"]');await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
  console.log('PASS: playable with browser storage blocked');
  assert.deepEqual(errors,[]);console.log('PASS: no uncaught browser exceptions');
  await writeFile(path.join(artifacts,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),browser:'Microsoft Edge (headless, real browser)',passed:true,missions:levels.length*2+pages.length,engine:'rust-wasm',checks:['first-visit guide and persistence','11-step cutout guide at five widths without target overlap','guide replay, pointer and keyboard, focus restoration','guide pauses execution and keeps drafts','guide in dark webpage and above completion','centered navigation at six widths','old progress migration','draft reload','single step','pause/reset','collision','unsupported code',`${pages.length} real DOM experiments`,'page effects and setup reset','celebration start/reset','fixed next button desktop/mobile/pointer/keyboard','poster removed','manual','escaped editor content','six responsive widths 320-1440','short-screen primary action','editor overlay alignment','lesson disclosure','18 lesson text and navigation contrast','mobile overflow both tracks','reduced motion','blocked storage','no uncaught exceptions']},null,2));
  await send('Browser.close');
}finally{ws?.close();child.kill();}
