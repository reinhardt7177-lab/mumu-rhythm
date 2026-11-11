import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const{chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const out='output/note-knights/lightbar/';await mkdir(out,{recursive:true});const report={layouts:[],errors:[]};
try{
 for(const[width,height]of[[1440,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{const draw=CanvasRenderingContext2D.prototype.fillRect;window.__barHeads=[];CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){if(this.canvas.id==='notes'){if(w===240&&h===360)window.__barHeads=[];if(w===38&&h===10&&['#81e6d0','#ff92ad','#ffe39a','#b8e491','#b7b5ff'].includes(String(this.fillStyle)))window.__barHeads.push({lane:Math.floor(x/48),x:x+19,y:y+5});}return draw.call(this,x,y,w,h);};});
  await page.goto('http://127.0.0.1:5212/');
  await page.locator('#notebook').tap();const book=page.locator('.notebook');await book.locator('select').nth(0).selectOption('3-4');await book.locator('select').nth(1).selectOption('gugak');await book.getByRole('tab',{name:'문제',exact:true}).tap();
  while(await book.locator('fieldset').getAttribute('data-question-id')!=='concept-34-gugak')await book.getByRole('button',{name:'다음',exact:true}).tap();
  assert.ok((await book.locator('legend').innerText()).includes('리듬 한 묶음'));await book.locator('.answer-option label').nth(2).tap();await book.getByRole('button',{name:'확인',exact:true}).tap();assert.equal(await book.locator('.question-feedback').getAttribute('data-correct'),'true');
  await page.screenshot({path:out+width+'-question.png'});await book.getByRole('button',{name:'닫기',exact:true}).tap();
  await page.locator('[data-world=present]').tap();await page.locator('#openBriefing').tap();await page.locator('[data-chart-level=melody]').tap();await page.locator('[data-mode=challenge]').tap();await page.locator('#start').tap();
  await page.waitForFunction(()=>window.__barHeads.length>=3);await page.screenshot({path:out+width+'-bars.png'});
  await page.waitForFunction(()=>window.__barHeads.some(n=>Math.abs(n.y-330)<4));
  const lane=await page.evaluate(()=>window.__barHeads.find(n=>Math.abs(n.y-330)<8)?.lane);
  assert.ok(Number.isInteger(lane));await page.locator('[data-lane="'+lane+'"]').tap();
  await page.waitForFunction(()=>Number(document.querySelector('#score').textContent.replaceAll(',',''))>0);
  report.layouts.push({width,height,touchHit:true,question:true});await page.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await writeFile(out+'report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
