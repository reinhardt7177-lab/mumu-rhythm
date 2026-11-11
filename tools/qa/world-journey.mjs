import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright-core');
const profile=process.env.QA_PROFILE||'desktop';assert.ok(['desktop','mobile'].includes(profile));
const mobile=profile==='mobile',base=process.env.QA_URL||'https://mumu-rhythm.vercel.app';
const tag=process.env.QA_TAG||'';assert.ok(!tag||/^[a-z0-9-]+$/.test(tag));
const out=`output/note-knights/world-journey/${tag?tag+'/':''}${profile}/`;await mkdir(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={base,profile,started:new Date().toISOString(),worlds:[],errors:[],limitations:['Chrome touch emulation, not a physical mobile device or Safari.','Inputs follow rendered note heads; game clock, score, HP and result state are not modified.','Audio signal verification is not human listening-quality or classroom validation.']};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
function observe(){
 const a=window.__journeyQA={heads:[],maxHeads:0,judges:{},inputs:[],meters:[],peaks:{},clicks:0,pair:false};let bodies=[];
 const bufferStart=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(...args){if(args[2]===.028)a.clicks++;return bufferStart.apply(this,args);};
 const fill=CanvasRenderingContext2D.prototype.fillRect,colors=['#81e6d0','#ff92ad','#ffe39a','#b8e491','#b7b5ff'];
 CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
  if(this.canvas.id==='notes'){
   if(w===240&&h===360){a.heads=[];bodies=[];a.pair=false;}
   const lane=Math.floor(x/48),color=String(this.fillStyle);
   if(w===26&&h>2)bodies.push({lane,height:h});
   if(color==='#fff2b0'&&w>=96&&h===2)a.pair=true;
   if(w===38&&h===10&&colors.includes(color)){a.heads.push({lane,x:x+19,y:y+5,body:bodies.filter(b=>b.lane===lane).at(-1)?.height});a.maxHeads=Math.max(a.maxHeads,a.heads.length);}
  }return fill.call(this,x,y,w,h);
 };
 const keys=['KeyA','KeyS','KeyD','KeyJ','KeyK'],down=new Set();
 a.startKeyboard=()=>a.timer=setInterval(()=>{for(let lane=0;lane<5;lane++){const active=a.heads.some(n=>n.lane===lane&&Math.abs(n.y-330)<4);if(active&&!down.has(lane)){dispatchEvent(new KeyboardEvent('keydown',{code:keys[lane],bubbles:true}));down.add(lane);}else if(!active&&down.has(lane)){dispatchEvent(new KeyboardEvent('keyup',{code:keys[lane],bubbles:true}));down.delete(lane);}}},8);
 a.stopKeyboard=()=>{clearInterval(a.timer);keys.forEach(code=>dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true})));down.clear();};
 const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const meter=this.context.createAnalyser();meter.fftSize=1024;connect.call(this,meter);connect.call(meter,destination);a.meters.push(meter);return destination;}return connect.call(this,destination,...args);};
 setInterval(()=>{if(!a.activeClip)return;for(const meter of a.meters){const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);for(const v of data)a.peaks[a.activeClip]=Math.max(a.peaks[a.activeClip]||0,Math.abs(v));}},16);
 addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{const t=document.getElementById('judge').textContent;a.judges[t]=(a.judges[t]||0)+1;}).observe(document.getElementById('judge'),{childList:true});for(const type of['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>a.inputs.push({type,trusted:e.isTrusted,pointerType:e.pointerType}),true);});
}
async function activate(locator){if(mobile){await locator.scrollIntoViewIfNeeded();await locator.tap();}else await locator.click();}
async function bounds(page,selector){
 const result=await page.locator(selector).evaluate(d=>{const r=d.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,horizontal:d.scrollWidth>d.clientWidth+1,page:document.documentElement.scrollWidth};});
 assert.ok(result.x>=-1&&result.y>=-1&&result.right<=result.width+1&&result.bottom<=result.height+1,JSON.stringify(result));assert.ok(!result.horizontal&&result.page<=result.width,JSON.stringify(result));return result;
}
async function pictures(page){await page.waitForFunction(()=>!document.querySelector('dialog[open] .notation:not([data-ready=true])'));assert.equal(await page.locator('dialog[open] .notation[data-error=true]').count(),0);const widths=await page.locator('dialog[open] .score-viewport:not(.zoomed)').evaluateAll(es=>es.map(e=>({width:e.clientWidth,svg:e.querySelector('svg')?.getBoundingClientRect().width})));assert.ok(widths.every(w=>w.svg<=w.width+1),JSON.stringify(widths));}
async function touchPlayer(page,context){
 const cdp=await context.newCDPSession(page),pads=await page.locator('[data-lane]').evaluateAll(es=>es.map((e,lane)=>{const r=e.getBoundingClientRect();return{id:lane+1,x:r.x+r.width/2,y:r.y+r.height/2,radiusX:3,radiusY:3,force:1};}));let held=[],maxContacts=0;
 try{while(true){const state=await page.evaluate(()=>({done:document.getElementById('results').open,active:[...new Set(window.__journeyQA.heads.filter(n=>Math.abs(n.y-330)<6).map(n=>n.lane+1))]}));if(state.done)break;
  const remaining=held.filter(id=>state.active.includes(id));if(remaining.length!==held.length){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:remaining.map(id=>pads[id-1])});held=remaining;}
  const added=state.active.filter(id=>!held.includes(id));if(added.length){held=[...held,...added];maxContacts=Math.max(maxContacts,held.length);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:held.map(id=>pads[id-1])});}
  await new Promise(r=>setTimeout(r,8));
 }}finally{if(held.length)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 return maxContacts;
}
try{
 const html=await(await fetch(base)).text(),js=html.match(/src="([^"]*quest-[^"]+\.js)"/)[1],localHtml=await readFile('dist/index.html','utf8'),localJs=localHtml.match(/src="([^"]*quest-[^"]+\.js)"/)[1];
 const bytes=Buffer.from(await(await fetch(base+js)).arrayBuffer());assert.equal(sha(bytes),sha(await readFile('dist'+localJs)));report.bundle={path:js,sha256:sha(bytes)};
 const bankBytes=Buffer.from(await(await fetch(base+'/assets/education/music-bank-120.json')).arrayBuffer());assert.equal(sha(bankBytes),sha(await readFile('public/assets/education/music-bank-120.json')));const bank=JSON.parse(bankBytes);
 const worlds=(process.env.QA_WORLDS||'past,present,future,fantasy').split(',');assert.ok(worlds.every(w=>['past','present','future','fantasy'].includes(w)));
 for(const world of worlds){
  const young=['past','future'].includes(world),grade=(mobile?!young:young)?'3-4':'5-6';
  const result={world,grade,clips:[],links:[],layouts:[]};report.worlds.push(result);
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base+'/assets/')&&r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});await page.addInitScript(observe);let driver;
  try{
   await page.goto(base);await activate(page.locator(`[data-world="${world}"]`));await activate(page.locator('#openBriefing'));assert.ok((await page.locator('#briefIntroduction').innerText()).length>20);await activate(page.locator(`[data-grade="${grade}"]`));
   if(await page.locator('#chartLevels').isVisible()){
    const level=process.env.QA_CHART_LEVEL||'melody';assert.ok(['pulse','groove','melody'].includes(level));const choice=page.locator(`[data-chart-level="${level}"]`);await activate(choice);assert.equal(await choice.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#chartLevels [aria-pressed="true"]').count(),1);result.chartLevel=level;await page.screenshot({path:out+world+'-difficulty.png'});
   }
   await activate(page.locator('[data-mode="challenge"]'));await activate(page.locator('#start'));await page.waitForFunction(()=>!document.getElementById('arena').hidden&&document.getElementById('progress').value>.001);
   if(process.env.QA_INPUT_FEEL==='1'){
    const clicks=()=>page.evaluate(()=>window.__journeyQA.clicks),tap=()=>mobile?page.locator('[data-lane="0"]').tap():page.keyboard.press('a');
    const pause=()=>activate(page.locator('#pause')),toggle=page.locator('#inputClick');
    const restart=async()=>{await activate(page.locator('#restartPause'));await page.locator('#paused').waitFor({state:'hidden'});};
    const before=await clicks();await tap();assert.equal(await clicks(),before+1);assert.equal(await page.locator('#score').innerText(),'0');
    await pause();await activate(toggle);assert.equal(await toggle.getAttribute('aria-pressed'),'false');await restart();
    const muted=await clicks();await tap();assert.equal(await clicks(),muted);assert.equal(await page.locator('#score').innerText(),'0');
    await pause();await activate(toggle);assert.equal(await toggle.getAttribute('aria-pressed'),'true');await restart();
    result.inputClick={unjudgedTap:1,mutedTap:0};
   }
   result.song=await page.locator('#playingTitle').innerText();result.layouts.push(await bounds(page,'.quest'));
   if(mobile)driver=touchPlayer(page,context);else await page.evaluate(()=>window.__journeyQA.startKeyboard());
   if(process.env.QA_INPUT_FEEL==='1'&&result.chartLevel==='melody'){
    await page.waitForFunction(()=>window.__journeyQA.pair);
    await page.screenshot({path:out+world+'-pair.png'});
   }
   await page.waitForFunction(()=>document.getElementById('progress').value>.12&&window.__journeyQA.heads.length>0,null,{timeout:100000});
   result.canvas=await page.locator('canvas').evaluateAll(es=>es.filter(c=>['notes','world'].includes(c.id)).map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<d.length;i+=40)colors.add(`${d[i]},${d[i+1]},${d[i+2]}`);return{id:c.id,width:c.width,height:c.height,colors:colors.size};}));
   // A musical rest can legitimately leave only lane/grid colors in this frame.
   assert.ok(result.canvas.every(c=>c.colors>(c.id==='world'?20:4)));assert.ok(await page.evaluate(()=>window.__journeyQA.maxHeads>0));await page.screenshot({path:out+world+'-game.png'});
   await page.waitForFunction(()=>document.getElementById('results').open,null,{timeout:120000});if(driver){result.maxContacts=await driver;driver=undefined;}else await page.evaluate(()=>window.__journeyQA.stopKeyboard());
   if(process.env.QA_INPUT_FEEL==='1'&&mobile&&result.chartLevel==='melody')assert.equal(result.maxContacts,2);
   result.stats=await page.locator('#stats').textContent();result.judges=await page.evaluate(()=>window.__journeyQA.judges);assert.ok(result.stats.includes('처치 4/4'),result.stats);assert.ok(Object.keys(result.judges).some(t=>t.includes('COMBO')));result.layouts.push(await bounds(page,'#results'));
   const fields=page.locator('#quiz fieldset');assert.equal(await fields.count(),5);result.items=[];
   await activate(page.locator('#answer'));assert.ok(!(await page.locator('#explanation').textContent()).includes('5/5'));await pictures(page);
   for(let i=0;i<5;i++){
    const field=fields.nth(i),id=await field.getAttribute('data-question-id'),q=bank.questions.find(q=>q.id===id);assert.equal(q.grade,grade);result.items.push({id,kind:q.kind,wrong:(q.correct+1)%q.choices.length});
    for(const [j,clip]of(q.audio||[]).entries()){
     await page.evaluate(id=>window.__journeyQA.activeClip=id,clip.id);const button=field.locator('.sound-row button').nth(j);await activate(button);await page.waitForFunction(({id,j})=>document.querySelectorAll(`#quiz [data-question-id="${id}"] .sound-row button`)[j]?.dataset.state==='playing',{id,j});await page.waitForFunction(({id,j})=>document.querySelectorAll(`#quiz [data-question-id="${id}"] .sound-row button`)[j]?.dataset.state==='idle',{id,j},{timeout:20000});
     const peak=await page.evaluate(id=>window.__journeyQA.peaks[id]||0,clip.id);assert.ok(peak>.001&&peak<.9,`${clip.id}: peak ${peak}`);result.clips.push({id:clip.id,peak});await page.evaluate(()=>window.__journeyQA.activeClip='');
    }
    await activate(field.locator('.answer-option label').nth(result.items[i].wrong));
   }
   assert.equal(new Set(result.items.map(q=>q.kind)).size,3);await activate(page.locator('#answer'));assert.ok((await page.locator('#explanation').textContent()).includes('0/5'));
   for(let i=0;i<5;i++){
    const field=fields.nth(i),item=result.items[i],q=bank.questions.find(q=>q.id===item.id),feedback=field.locator('.question-feedback'),text=await feedback.innerText();assert.equal(await feedback.getAttribute('data-correct'),'false');assert.ok(text.includes(q.misconceptions[item.wrong])&&text.includes(q.why)&&text.includes(q.choices[q.correct].text),q.id);
    if(i===0){await feedback.scrollIntoViewIfNeeded();await page.screenshot({path:out+world+'-wrong.png'});}
    await activate(field.locator('.lesson-link'));const book=page.locator('.notebook'),lesson=bank.lessons.find(l=>l.id===q.lessonId);assert.equal(await book.locator('select').nth(0).inputValue(),grade);assert.equal(await book.locator('select').nth(1).inputValue(),q.lessonId);assert.equal(await book.locator('.notebook-body h3').innerText(),lesson.title);assert.ok((await book.locator('.notebook-body').innerText()).includes(lesson.levels[grade].intro));await pictures(page);result.layouts.push(await bounds(page,'.notebook'));
    await activate(book.locator('summary'));for(const standard of lesson.standards[grade])assert.ok((await book.locator('.notebook-body').innerText()).includes(standard));
    if(i===0)await page.screenshot({path:out+world+'-lesson.png'});await activate(book.getByRole('button',{name:'닫기',exact:true}));assert.ok(await page.locator('#results').isVisible());assert.equal(await field.locator('input:checked').inputValue(),String(item.wrong));assert.equal(await feedback.innerText(),text);result.links.push({question:q.id,lesson:q.lessonId,grade,preserved:true});
    await activate(field.locator('.answer-option label').nth(q.correct));
   }
   await activate(page.locator('#answer'));result.quiz=await page.locator('#explanation').innerText();assert.ok(result.quiz.includes('5/5'));assert.equal(await page.locator('#quiz .question-feedback[data-correct=true]').count(),5);result.layouts.push(await bounds(page,'#results'));await page.locator('#explanation').scrollIntoViewIfNeeded();await page.screenshot({path:out+world+'-correct.png'});
   if(mobile){await page.setViewportSize({width:320,height:740});await pictures(page);result.layouts.push(await bounds(page,'#results'));await page.screenshot({path:out+world+'-320-result.png'});await page.setViewportSize({width:390,height:844});}
   result.inputs=await page.evaluate(()=>({touch:window.__journeyQA.inputs.filter(e=>e.pointerType==='touch'&&e.type==='pointerdown').length,allTrusted:window.__journeyQA.inputs.filter(e=>e.pointerType==='touch').every(e=>e.trusted)}));if(mobile){assert.ok(result.inputs.touch>20);assert.equal(result.inputs.allTrusted,true);if(!result.chartLevel||result.chartLevel==='melody')assert.ok((result.judges['HOLD!']||0)>0,'No successful mobile long note');}
   await activate(page.locator('#resultHome'));assert.ok(await page.locator('#library').isVisible());assert.equal(await page.locator('dialog[open]').count(),0);result.pass=true;
  }finally{if(driver){await context.close();await driver.catch(e=>result.driverClose=String(e));}else await context.close();await writeFile(out+'report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(result));}
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{report.finished=new Date().toISOString();await writeFile(out+'report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,profile,worlds:report.worlds.length,errors:report.errors,failure:report.failure}));await browser.close();}
