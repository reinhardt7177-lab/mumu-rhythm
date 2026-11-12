import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const base = process.env.QA_URL || 'http://127.0.0.1:5212/';
const out = 'output/note-knights/library-note-feel';
const profiles = { keyboard: {width:1440,height:900}, touch: {width:390,height:844} };
const keys = ['a','s','d','j','k'];
const vite = await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
let charts;
try {
  const { MUSIC_LIBRARY } = await vite.ssrLoadModule('/src/quest/catalog.ts');
  const { chartForLevel } = await vite.ssrLoadModule('/src/content/musicalChart.ts');
  const { doubleScroll } = await vite.ssrLoadModule('/src/core/scrollSpeed.ts');
  charts = await Promise.all(MUSIC_LIBRARY.map(async ({song,worldId}) => ({worldId,...doubleScroll(await chartForLevel(song,'melody'))})));
} finally { await vite.close(); }
assert.equal(charts.length,16);
await mkdir(out,{recursive:true});

function observe({notes,approach}) {
  const q = window.noteFeelQA = {heads:[], flashes:0, clicks:0, pops:0, fx:new Set(), judges:[], align:[], trusted:0};
  const colors = ['#81e6d0','#ff92ad','#ffe39a','#b8e491','#b7b5ff'];
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  const start = AudioBufferSourceNode.prototype.start;
  let clock, audioStart, audioTime;
  AudioBufferSourceNode.prototype.start = function(...args) {
    if (this.buffer?.duration > 40) { clock=this.context;audioStart=args[0];q.duration=this.buffer.duration; }
    else if (args[2]===.028) q.clicks++;
    else if (this.buffer?.duration < .2) q.pops++;
    return start.apply(this,args);
  };
  CanvasRenderingContext2D.prototype.fillRect = function(x,y,w,h) {
    if(this.canvas.id==='notes'){
      if(w===240&&h===360){
        q.heads=[];q.flashes=0;
        const ts=clock?.getOutputTimestamp();
        if(ts?.contextTime>0&&ts.performanceTime>0) audioTime=ts.contextTime+(performance.now()-ts.performanceTime)/1000-audioStart;
      }
      if(w===44&&h===5&&colors.includes(this.fillStyle)) q.flashes|=1<<Math.floor(x/48);
      if(w===38&&h===10&&colors.includes(this.fillStyle)){
        const lane=Math.floor(x/48), center=y+5;
        q.heads.push({lane,center});
        if(center>=314&&center<330&&Number.isFinite(audioTime)){
          const time=audioTime+(330-center)*approach/310;
          const note=notes.find(n=>n.lane===lane&&Math.abs(n.time-time)<.065);
          q.align.push(note?Math.abs(note.time-time)*1000:1000);
        }
      }
    }
    return fill.call(this,x,y,w,h);
  };
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(image,...args) {
    if(this.canvas.id==='notes'&&image.src?.includes('/pixelfx-v5/')) q.fx.add(new URL(image.src).pathname);
    return draw.call(this,image,...args);
  };
  addEventListener('DOMContentLoaded',()=>{
    const judge=document.querySelector('#judge');
    new MutationObserver(()=>q.judges.push(judge.textContent)).observe(judge,{childList:true});
    for(const type of ['keydown','pointerdown']) addEventListener(type,e=>{
      if(e.isTrusted&&(type==='keydown'||e.pointerType==='touch')) q.trusted++;
    });
  });
}

async function check(browser,chart,profile, screenshot) {
  const mobile=profile==='touch',viewport=profiles[profile];
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
  try {
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(observe,{approach:chart.approachSeconds??3.2,notes:chart.melody.map(n=>({lane:n.lane,time:n.beat*60/chart.bpm}))});
    const activate=l=>mobile?l.tap():l.click();
    await page.goto(base);
    await activate(page.locator(`[data-song="${chart.id}"]`));
    await activate(page.locator('#openBriefing'));
    await activate(page.locator('[data-chart-level="melody"]'));
    await activate(page.locator('[data-mode="challenge"]'));
    await activate(page.locator('#start'));
    await page.locator('#arena').waitFor({state:'visible'});
    const judge=page.locator('#judge'), canvas=page.locator('#notes'), pad=page.locator('[data-lane="0"]');
    const track=await canvas.boundingBox(), notice=await judge.boundingBox();
    assert.ok(notice&&notice.height>0&&notice.y+notice.height<=track.y,`feedback must stay above the bars: ${JSON.stringify({notice,track})}`);
    const pads=await page.locator('[data-lane]').evaluateAll(es=>es.map((e,i)=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:i+1};}));
    const centerError=Math.max(...pads.map((p,i)=>Math.abs(p.x-(track.x+track.width*(i+.5)/5))));
    assert.ok(centerError<.5,`lane and button centers differ by ${centerError}px`);
    if(mobile)await pad.tap();else await page.keyboard.press('a');
    await page.waitForFunction(()=>window.noteFeelQA.flashes&1);
    assert.equal(await page.evaluate(()=>window.noteFeelQA.clicks),1);
    assert.equal(await page.locator('#score').innerText(),'0');
    const cdp=await context.newCDPSession(page);
    let held=[],found=false;
    const deadline=Date.now()+25000;
    while(Date.now()<deadline){
      const sample=await page.evaluate(()=>({lanes:window.noteFeelQA.heads.filter(n=>Math.abs(n.center-330)<=6).map(n=>n.lane),combo:window.noteFeelQA.judges.at(-1)?.endsWith(' COMBO'),fx:[...window.noteFeelQA.fx]}));
      const lanes=[...new Set(sample.lanes)];
      const remaining=held.filter(l=>lanes.includes(l));
      if(mobile){
        if(remaining.length!==held.length) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:remaining.map(l=>pads[l])});
        if(lanes.some(l=>!remaining.includes(l))) await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:lanes.map(l=>pads[l])});
      } else {
        for(const lane of held.filter(l=>!lanes.includes(l))) await page.keyboard.up(keys[lane]);
        for(const lane of lanes.filter(l=>!held.includes(l))) await page.keyboard.down(keys[lane]);
      }
      held=lanes;
      if(sample.combo&&sample.fx.some(path=>path.includes('/mana-burst/'))){
        found=true;
        const [active,current]=await Promise.all([judge.boundingBox(),canvas.boundingBox()]);
        assert.ok(active.y+active.height<=current.y&&Math.abs(track.y-current.y)<.5,'visible combo stays outside and does not move the track');
        if(screenshot) await page.screenshot({path:`${out}/${chart.worldId}-${profile}.png`});
        break;
      }
      await new Promise(r=>setTimeout(r,8));
    }
    const result=await page.evaluate(()=>{const {judges,pops,clicks,duration,align,trusted,fx}=window.noteFeelQA;return {judges,pops,clicks,duration,align,trusted,fx:[...fx]};});
    assert.ok(found&&result.judges.includes('PERFECT')&&result.fx.some(path=>path.includes('/crit-hit/')),JSON.stringify(result));
    assert.ok(result.pops>=8&&result.clicks>=9&&result.trusted>=9);
    assert.ok(result.duration>=chart.melody.at(-1).beat*60/chart.bpm);
    const sorted=result.align.sort((a,b)=>a-b), p95=sorted[Math.floor(sorted.length*.95)];
    assert.ok(sorted.length>=8&&p95<=30,`audio clock vs bars: ${sorted.length} samples, p95 ${p95}ms`);
    assert.deepEqual(errors,[]);
    return {centerError, samples:sorted.length,p95,perfect:result.judges.filter(j=>j==='PERFECT').length,fx:result.fx};
  } finally { await context.close(); }
}

const selected=process.env.QA_SONGS?charts.filter(c=>process.env.QA_SONGS.split(',').includes(c.id)):charts;
assert.ok(selected.length);
const report=[];
const tasks=Object.keys(profiles).map(async profile=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  try {
    const worlds=new Set();
    for(const chart of selected){
      const id=chart.id;
      try {
        const result=await check(browser,chart,profile,!worlds.has(chart.worldId));
        report.push({id,profile,pass:true,...result});worlds.add(chart.worldId);
        console.log(`${profile}/${id} OK (${result.p95.toFixed(1)}ms p95)`);
      } catch(error){
        report.push({id,profile,pass:false,error:String(error)});
        console.error(`${profile}/${id}: ${error.message}`);
      }
    }
  } finally { await browser.close(); }
});
try { await Promise.all(tasks); }
finally { await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)); }
assert.equal(report.length,selected.length*2);
assert.ok(report.every(r=>r.pass),'See the report for failed cases');
