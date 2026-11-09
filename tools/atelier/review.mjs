/** Actual browser evidence for the art slice. Pixel capture is NOT art acceptance.
 * Run with the game already served: node tools/atelier/review.mjs [baseURL]
 * ART_REVIEW_RECORD=1 records the running WebGL canvas with MediaRecorder.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
const base=process.argv[2]||'http://127.0.0.1:5173';
const output='docs/screenshots/astral-slice';mkdirSync(output,{recursive:true});
const profile=mkdtempSync(os.tmpdir()+'/astral-review-');
const chrome=spawn(process.env.CHROME_BIN||'chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--remote-debugging-port=9241','--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function poll(fn,label,timeout=180000){const start=Date.now();while(Date.now()-start<timeout){try{const r=await fn();if(r)return r;}catch{}await delay(150);}throw Error('Timed out: '+label);}
let ws;const errors=[];const logs=[];
try{
 const page=await poll(async()=>{const pages=await(await fetch('http://127.0.0.1:9241/json/list')).json();return pages.find(x=>x.type==='page');},'Chrome');
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(output+'/'+name+'.png',Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base+'/atelier.html'});
 await poll(()=>evaluate('window.__atelier?.snapshot()?.ready'),'slice assets');
 await evaluate('window.__atelier.freeze(true)');await shot('05-final-garden');logs.push(await evaluate('window.__atelier.snapshot()'));
 await evaluate("document.querySelector('#camera').click()");await shot('05-final-hero');
 // Native gameplay view is the existing isometric follow controller.
 await evaluate("document.querySelector('#camera').click()");await shot('05-final-gameplay');
 await evaluate("document.querySelector('#camera').click();window.__atelier.freeze(false);document.querySelector('#cast').click()");
 await poll(()=>evaluate('window.__atelier.snapshot().castAge>=.50 && window.__atelier.snapshot().castAge<1.3'),'ability release');
 await evaluate('window.__atelier.freeze(true)');await shot('05-final-ability');logs.push(await evaluate('window.__atelier.snapshot()'));
 await evaluate('window.__atelier.freeze(false)');
 // Verify motion through the existing input handler, without changing positions by script.
 const before=await evaluate('window.__atelier.snapshot().position');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS',windowsVirtualKeyCode:83});
 await poll(async()=>{const p=await evaluate('window.__atelier.snapshot().position');return Math.hypot(p[0]-before[0],p[2]-before[2])>.4;},'walking');
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS',windowsVirtualKeyCode:83});
 logs.push({walkingFrom:before,walkingTo:await evaluate('window.__atelier.snapshot().position')});
 if(process.env.ART_REVIEW_RECORD==='1'){
  await send('Page.navigate',{url:base+'/atelier.html'});
  await poll(()=>evaluate('window.__atelier?.snapshot()?.ready'),'recording assets');
  await send('Emulation.setDeviceMetricsOverride',{width:960,height:600,deviceScaleFactor:1,mobile:false});
  // This records real browser time. Slow software rendering is not retimed.
  await evaluate(`window.__recording=new Promise(resolve=>{const c=document.querySelector('canvas');const stream=c.captureStream(15);const chunks=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000});rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=async()=>{const b=new Blob(chunks,{type:'video/webm'});const bytes=new Uint8Array(await b.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);resolve(btoa(binary));stream.getTracks().forEach(t=>t.stop());};window.__stopRecording=()=>rec.stop();rec.start();});true`);
  await delay(2000);await evaluate("document.querySelector('#cast').click()");
  await delay(22000);await evaluate('window.__stopRecording();true');
  const data=await evaluate('window.__recording');writeFileSync(output+'/gameplay.webm',Buffer.from(data,'base64'));
 }
 writeFileSync(output+'/browser-evidence.json',JSON.stringify({capturedAt:new Date().toISOString(),browser:'Chromium / SwiftShader',viewport:[1280,800],logs,errors},null,2));
 if(errors.length)throw Error('Browser errors: '+JSON.stringify(errors));
 console.log('Art evidence captured; inspect the PNGs. Gameplay input verified.');
}finally{ws?.close();chrome.kill();setTimeout(()=>{try{rmSync(profile,{recursive:true,force:true});}catch{}},500);}
