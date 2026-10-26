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
  const screenshot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(path.join(artifacts,name),Buffer.from(shot.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://localhost:4173'});
  await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
  await evaluate("localStorage.clear();location.reload();true");
  await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
  await sleep(400);await screenshot('desktop.png');
  console.log('PASS: initial desktop, actual Rust Wasm loaded');
  assert.match(await evaluate("document.getElementById('board').getAttribute('aria-label')"),/^实验 1：/);
  const setCode=async(value)=>evaluate(`(() => {const el=document.getElementById('code');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input'));return true;})()`);
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const text=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
  const levels=await evaluate("import('./levels.mjs').then(m=>m.LEVELS)");
  const pages=await evaluate("import('./page-lab.mjs').then(m=>m.PAGE_LEVELS)");
  const originalFirst=levels.find(level=>level.id===1),originalCorner=levels.find(level=>level.id===2);
  await evaluate(`localStorage.setItem('code-lab-progress-v1',JSON.stringify({language:'js',levelId:1,completed:{js:[1,2,3,4,5,6],rust:[2]},drafts:{'js:1':'// 旧版本草稿\\nforward();'}}));location.reload();true`);
  await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
  assert.match(await text('progress-count'),/6.*18/s);assert.match(await evaluate("document.getElementById('code').value"),/旧版本草稿/);
  assert.equal(await evaluate("document.querySelector('[data-level=\"1\"] .number').textContent"),'03');
  await evaluate('localStorage.clear();location.reload();true');await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
  console.log('PASS: old six-lesson progress and draft identities preserved');
  // A draft should survive a real reload, not merely an in-memory switch.
  await setCode('// 保存我的草稿\nforward();\nforward();');
  await evaluate('location.reload();true');await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
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
  await click('[data-language="js"]');await click('[data-level="1"]');
  await setCode(originalFirst.solutions.js);await click('#step-button');
  assert.equal(await evaluate("document.getElementById('board').dataset.celebrating"),'false');
  assert.match(await text('steps-count'),/^1 条/);assert.match(await text('board-badge'),/暂停/);
  await click('#step-button');assert.match(await text('steps-count'),/^2 条/);
  console.log('PASS: single-step advances exactly one command');
  await click('[data-level="2"]');await setCode(originalCorner.solutions.js);await click('[data-speed="0.5"]');await click('#run-button');await click('#run-button');
  const paused=await text('steps-count');await sleep(700);assert.equal(await text('steps-count'),paused);
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
    await setCode(page.solutions.js);await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
    const checks=await evaluate(`import('./page-lab.mjs').then(m=>m.checkPageGoals(m.PAGE_LEVELS.find(x=>x.id===${page.id}),document))`);
    assert.ok(checks.every(check=>check.passed));
    assert.equal(await evaluate("document.getElementById('board').dataset.celebrating"),'true');
    console.log(`PASS: real webpage experiment ${page.id}, all DOM goals met`);
  }
  await sleep(450);await screenshot('web-lab-complete.png');
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-lab-progress-v1')).pageCompleted"),[1,2,3,4,5,6]);
  await click('#next-button');assert.equal(await evaluate('document.documentElement.dataset.track'),'robot');
  assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'CODE LAB.');
  assert.equal(await evaluate("document.body.style.backgroundColor"),'');
  assert.equal(await evaluate("document.getElementById('board').dataset.celebrating"),'false');
  await click('#page-tab');await click('[data-level="1"]');
  await setCode("document.querySelector('#lab-title').textContent = '不应执行'; alert('blocked');");await click('#run-button');
  assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'CODE LAB.');assert.match(await text('console'),/需要 document/);
  await setCode(pages[0].solutions.js);await click('#step-button');assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'星际实验室');
  await click('#reset-button');assert.equal(await evaluate("document.getElementById('lab-title').textContent"),'CODE LAB.');
  await click('#lab-tab');
  console.log('PASS: page/track/reset clear effects and celebration, invalid code has no partial effects');
  await click('#manual-button');assert.equal(await evaluate("document.getElementById('manual-dialog').open"),true);await screenshot('manual.png');await click('#close-manual');
  await click('[data-level="1"]');await click('#reset-button');await setCode('// <img src=x onerror=alert(1)>\nforward();');assert.equal(await evaluate("document.querySelectorAll('.editor-surface img').length"),0);
  await click('#reset-button');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);
  const mobileSize=await evaluate('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,inner:window.innerWidth})');
  assert.ok(mobileSize.scroll<=390,JSON.stringify(mobileSize));
  await screenshot('mobile.png');
  await click('#page-tab');await click('[data-level="6"]');await sleep(150);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=390'));
  await screenshot('mobile-web.png');await click('#lab-tab');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate('location.reload();true');await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
  await click(`[data-level="${levels[0].id}"]`);await setCode(levels[0].solutions.js);await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
  console.log('PASS: reduced-motion mode remains playable');
  console.log('PASS: manual, escaped editor content, 390px mobile layout');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"Storage.prototype.getItem=function(){throw new Error('blocked')};Storage.prototype.setItem=function(){throw new Error('blocked')};"});
  await evaluate('location.reload();true');await waitFor("document.documentElement.dataset.engine === 'rust-wasm'");
  await setCode(levels[0].solutions.js);await click('[data-speed="4"]');await click('#run-button');await waitFor("!document.getElementById('completion').hidden");
  console.log('PASS: playable with browser storage blocked');
  assert.deepEqual(errors,[]);console.log('PASS: no uncaught browser exceptions');
  await writeFile(path.join(artifacts,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),browser:'Microsoft Edge (headless, real browser)',passed:true,missions:levels.length*2+pages.length,engine:'rust-wasm',checks:['old progress migration','draft reload','single step','pause/reset','collision','unsupported code','6 real DOM experiments','page effect reset','celebration start/reset','manual','escaped editor content','mobile overflow both tracks','reduced motion','blocked storage','no uncaught exceptions']},null,2));
  await send('Browser.close');
}finally{ws?.close();child.kill();}
