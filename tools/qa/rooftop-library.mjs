import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const base = process.env.QA_URL || 'http://127.0.0.1:5212/';
const out = 'output/note-knights/rooftop-library';
await mkdir(out,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  for(const [width,height] of [[1440,900],[390,844],[320,600],[844,390]]) {
    const mobile=width<1000;
    const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.previewAudio=[];
      const start=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...args){
        if(this.buffer?.duration>40&&args[2]===12){
          const event={offset:args[1],duration:args[2],ended:false};window.previewAudio.push(event);
          this.addEventListener('ended',()=>{event.ended=true;},{once:true});
        }
        return start.apply(this,args);
      };
    });
    await page.goto(base);
    const activate=l=>mobile?l.tap():l.click();
    const rows=page.locator('[data-song]'),preview=page.locator('#listenPreview'),brief=page.locator('#openBriefing');
    assert.equal(await rows.count(),16);
    assert.equal(await rows.first().getAttribute('data-song'),'rooftop-swing');
    assert.equal(await rows.first().getAttribute('aria-pressed'),'true');
    await page.waitForFunction(()=>document.getElementById('worldArt').naturalWidth>0);
    await page.evaluate(()=>document.fonts.ready);
    const layout=await page.evaluate(()=>{
      const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
      return {stage:box('.world-preview'),list:box('#songList'),play:box('#listenPreview'),brief:box('#openBriefing'),hero:box('.travel-bard'),enemy:box('.travel-enemy'),pageWidth:document.documentElement.scrollWidth};
    });
    assert.equal(layout.stage.width,width);
    assert.ok(layout.stage.bottom<=layout.list.top&&layout.list.height>=44&&layout.brief.bottom<=height&&layout.play.bottom<=height);
    assert.ok(layout.hero.left>=0&&layout.enemy.right<=width&&layout.enemy.left>=layout.hero.right-1);
    assert.equal(layout.pageWidth,width);
    assert.equal(await page.evaluate(()=>window.previewAudio.length),0,'menu never autoplays audio');
    await page.screenshot({path:`${out}/${width}x${height}.png`});
    if(width===1440){
      const animated=async()=>page.locator('.travel-bard').evaluate(e=>e.style.backgroundPosition);
      await page.locator('#replayPreview').click();
      const first=await animated();
      await page.waitForFunction(first=>document.querySelector('.travel-bard').style.backgroundPosition!==first,first);
      await activate(preview);
      await page.waitForFunction(()=>window.previewAudio.length===1);
      assert.equal(await preview.getAttribute('aria-pressed'),'true');
      await page.waitForFunction(()=>window.previewAudio[0].ended,{},{timeout:16000});
      assert.equal(await preview.getAttribute('aria-pressed'),'false');
    }
    if(width===390){
      await activate(preview);await page.waitForFunction(()=>window.previewAudio.length===1);
      await activate(page.locator('[data-song="cloud-hop"]'));
      await page.waitForFunction(()=>window.previewAudio[0].ended);
      assert.equal(await preview.getAttribute('aria-pressed'),'false');
      for(const world of ['past','future','fantasy','present']){
        await activate(page.locator(`[data-world="${world}"]`));
        assert.equal(await page.locator('#app').getAttribute('data-world-theme'),world);
        await page.waitForFunction(()=>document.getElementById('worldArt').naturalWidth>0);
      }
      await activate(preview);await page.waitForFunction(()=>window.previewAudio.length===2);
      await activate(brief);await page.waitForFunction(()=>window.previewAudio[1].ended);
      assert.equal(await page.locator('#briefTitle').innerText(),'옥상 스윙');
      await activate(page.locator('#start'));
      await page.locator('#arena').waitFor({state:'visible'});
      await page.waitForFunction(()=>document.getElementById('progress').value>.002);
      await page.screenshot({path:`${out}/390-game.png`});
    }
    assert.deepEqual(errors,[]);
    console.log(`${width}x${height}: menu layout OK`);
    await page.close();
  }
  const reduced=await browser.newPage({reducedMotion:'reduce'});
  await reduced.goto(base);
  await reduced.locator('#replayPreview').waitFor({state:'hidden'});
  assert.ok(await reduced.locator('#openBriefing').isVisible());
} finally { await browser.close(); }
