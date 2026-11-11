import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const{chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base=process.env.QA_URL||'http://127.0.0.1:5214',out='output/note-knights/plain-language/';
await mkdir(out,{recursive:true});const report={base,worlds:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const[world,width,height]of[['past',1440,900],['present',1440,900],['future',1440,900],['fantasy',1440,900],['present',390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{
   window.__scrollQA={heads:[],rates:[]};const draw=CanvasRenderingContext2D.prototype.fillRect;
   CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){if(this.canvas.id==='notes'){if(w===240&&h===360)window.__scrollQA.heads=[];if(w===38&&h===10&&['#81e6d0','#ff92ad','#ffe39a','#b8e491','#b7b5ff'].includes(String(this.fillStyle)))window.__scrollQA.heads.push({lane:Math.floor(x/48),y:y+5});}return draw.call(this,x,y,w,h);};
   const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.__scrollQA.rates.push(this.playbackRate.value);return start.apply(this,args);};
  });
  await page.goto(base);const source=await page.evaluate(async world=>{const{songForWorld}=await import('/src/quest/worlds.ts');const s=songForWorld(world);return{id:s.id,approach:s.approachSeconds??3.2,bpm:s.bpm};},world);
  await page.locator('[data-world="'+world+'"]').tap();await page.locator('#openBriefing').tap();await page.locator('[data-mode=challenge]').tap();await page.locator('#start').tap();
  await page.waitForFunction(()=>window.__scrollQA.heads.some(n=>n.y>85&&n.y<180));
  const a=await page.evaluate(()=>({n:window.__scrollQA.heads.find(n=>n.y>85&&n.y<180),t:performance.now()}));
  await page.waitForTimeout(160);
  const expected=310/(source.approach/2);
  const b=await page.evaluate(({lane,y,t,expected})=>{const now=performance.now(),target=y+(now-t)/1000*expected;return{n:window.__scrollQA.heads.filter(n=>n.lane===lane).sort((a,b)=>Math.abs(a.y-target)-Math.abs(b.y-target))[0],t:now,rates:window.__scrollQA.rates};},{...a.n,t:a.t,expected});
  assert.ok(b.n);const measured=(b.n.y-a.n.y)/((b.t-a.t)/1000),ratio=measured/(310/source.approach);
  assert.ok(ratio>1.5&&ratio<2.6,world+': '+ratio);assert.ok(b.rates.length>0&&b.rates.every(r=>r===1));
  const row={world,width,height,id:source.id,bpm:source.bpm,expected,measured,speedRatio:ratio,musicPlaybackRate:b.rates[0]};report.worlds.push(row);await page.screenshot({path:out+'speed-'+world+'-'+width+'.png'});await page.close();console.log(JSON.stringify(row));
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await writeFile(out+'scroll-speed.json',JSON.stringify(report,null,2));await browser.close();}
