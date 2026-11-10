/** Frame-stepped ACTUAL browser renderer, encoded by observed simulation time.
 * This is an animation study, NOT a real-time performance recording. The raw
 * gameplay.webm remains separate. No pose, dt, damage or actor position injection.
 * Requires the built slice served on the supplied URL and ffmpeg/Chromium.
 */
import{spawn,spawnSync}from'node:child_process';
import{mkdirSync,mkdtempSync,writeFileSync,rmSync}from'node:fs';
import os from'node:os';
const base=process.argv[2]||'http://127.0.0.1:4191',query=process.env.ART_REVIEW_QUERY||'';
const out='docs/screenshots/astral-slice',frames='test-artifacts/atelier-animation';mkdirSync(frames,{recursive:true});mkdirSync(out,{recursive:true});
const profile=mkdtempSync(os.tmpdir()+'/astral-study-');
const chrome=spawn(process.env.CHROME_BIN||'chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--remote-debugging-port=9242','--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let ws;const errors=[],records=[];
async function poll(fn,label){const started=Date.now();while(Date.now()-started<600000){try{const r=await fn();if(r)return r;}catch{}await delay(200);}throw Error('Timed out: '+label);}
try{
 const page=await poll(async()=>{const pages=await(await fetch('http://127.0.0.1:9242/json/list')).json();return pages.find(p=>p.type==='page');},'Chrome');
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:960,height:600,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base+'/atelier.html'+(query?'?'+query:'')});await poll(()=>evaluate('window.__atelier?.snapshot().ready'),'original art');
 await evaluate('window.__atelier.freeze(true)');const start=await evaluate('window.__atelier.snapshot().simulationTime');if(!Number.isFinite(start))throw Error('Missing observed simulation time');
 for(let i=0;i<600;i++){
  // GameEngine registered its next rAF before this callback. Let that one
  // canonical update render, then pause with the existing pause owner.
  const state=await evaluate(`new Promise(resolve=>{window.__atelier.freeze(false);${i===5?"document.querySelector('#cast').click();":''}requestAnimationFrame(()=>{window.__atelier.freeze(true);resolve(window.__atelier.snapshot());});})`);
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>resolve(true)))');
  const file=String(i).padStart(3,'0')+'.png',shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(frames+'/'+file,Buffer.from(shot.data,'base64'));
  records.push({file,...state});writeFileSync(frames+'/progress.json',JSON.stringify({start,records,errors},null,2));console.log('Animation study frame',i,'simulation time',state.simulationTime-start);
  if(i>20&&state.simulationTime-start>=4.4)break;
 }
 if(errors.length||records.length<40||records.at(-1).simulationTime-start<4.4)throw Error('Incomplete study or browser exceptions');
 let concat='';for(let i=0;i<records.length;i++){concat+=`file '${records[i].file}'\noption framerate 1000\nduration ${Math.max(.001,(records[i+1]?.simulationTime??records[i].simulationTime+.05)-records[i].simulationTime)}\n`;}
 concat+=`file '${records.at(-1).file}'\noption framerate 1000\n`;writeFileSync(frames+'/timing.txt',concat);
 const encode=spawnSync('ffmpeg',['-y','-f','concat','-safe','0','-i',frames+'/timing.txt','-vf',"drawbox=x=0:y=570:w=iw:h=30:color=black@0.65:t=fill,drawtext=text='FRAME-STEPPED ENGINE STUDY / SIMULATION TIME / NOT REAL-TIME FPS':x=18:y=580:fontsize=11:fontcolor=white",'-fps_mode','vfr','-enc_time_base','1:1000','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out+'/animation-study.mp4'],{stdio:'inherit'});
 if(encode.status!==0)throw Error('Animation study encoding failed');
 writeFileSync(out+'/animation-study-evidence.json',JSON.stringify({capturedAt:new Date().toISOString(),method:'One existing GameEngine rAF per frame; pause API only; encoded by observed simulationTime deltas. Not real-time rendering performance.',url:base+'/atelier.html'+(query?'?'+query:''),records,errors},null,2));
}finally{ws?.close();chrome.kill();setTimeout(()=>{try{rmSync(profile,{recursive:true,force:true});}catch{}},500);}
