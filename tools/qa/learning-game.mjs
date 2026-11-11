import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import{createHash}from'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const base = process.env.QA_GAME_URL || 'http://127.0.0.1:5201';
const tag=process.env.QA_TAG||'';if(tag&&!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid QA tag');
const out = 'output/note-knights/learning-120/'+(tag?tag+'/':''); await mkdir(out, { recursive: true });
const report = { base, started: new Date().toISOString(), worlds: [], errors: [], limitations: ['Synthetic keyboard input follows rendered note heads; no game clock or score overrides.', 'Tablet touch uses trusted Chrome CDP emulation, not physical hardware.'] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
function observe() {
 const a = window.__gameQA = { heads: [], judges: {}, input: [] }; let bodies = [];
 const fill = CanvasRenderingContext2D.prototype.fillRect, colors = ['#81e6d0', '#ff92ad', '#ffe39a', '#b8e491', '#b7b5ff'];
 CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
  if (this.canvas.id === 'notes') {
   if (w === 240 && h === 360) { a.heads = []; bodies = []; }
   const lane = Math.floor(x / 48), color = String(this.fillStyle);
   if (w === 26 && h > 2) bodies.push({ lane, height: h });
   if (w === 38 && h === 10 && colors.includes(color)) a.heads.push({ lane, x: x + 19, y: y + 5, body: bodies.filter(b => b.lane === lane).at(-1)?.height, white: false });
   if (color === '#ffffff' && (h === 1 || h === 2) && a.heads.length) a.heads.at(-1).white = true;
  }
  return fill.call(this, x, y, w, h);
 };
 const keys = ['KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK'], down = new Set();
 a.start = () => a.timer = setInterval(() => { for (let lane = 0; lane < 5; lane++) { const active = a.heads.some(n => n.lane === lane && Math.abs(n.y - 330) < 4); if (active && !down.has(lane)) { window.dispatchEvent(new KeyboardEvent('keydown', { code: keys[lane], bubbles: true })); down.add(lane); } else if (!active && down.has(lane)) { window.dispatchEvent(new KeyboardEvent('keyup', { code: keys[lane], bubbles: true })); down.delete(lane); } } }, 8);
 a.stop = () => { clearInterval(a.timer); keys.forEach(code => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))); down.clear(); };
 addEventListener('DOMContentLoaded', () => {
  new MutationObserver(() => { const text = document.getElementById('judge').textContent; a.judges[text] = (a.judges[text] || 0) + 1; }).observe(document.getElementById('judge'), { childList: true });
  for (const type of ['pointerdown', 'pointerup', 'pointercancel']) document.addEventListener(type, e => a.input.push({ type, trusted: e.isTrusted, pointerType: e.pointerType }), true);
 });
}
async function open(touch = false) {
 const context = await browser.newContext({ viewport: touch ? { width: 1024, height: 768 } : { width: 1440, height: 900 }, hasTouch: touch, isMobile: touch });
 const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message)); await page.addInitScript(observe); await page.goto(base);
 const url=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.src).find(s=>/\/assets\/quest-/.test(s)));assert.ok(url);const bytes=await(await page.request.get(url)).body();
 return { page, context, bundle:{url,sha256:createHash('sha256').update(bytes).digest('hex')} };
}
async function start(page, world, grade, mode = 'challenge') {
 await page.locator(`[data-world="${world}"]`).click(); await page.locator('#openBriefing').click(); await page.locator(`[data-grade="${grade}"]`).click(); await page.locator(`[data-mode="${mode}"]`).click(); await page.locator('#start').click(); await page.waitForFunction(() => !document.getElementById('arena').hidden && document.getElementById('progress').value > .001);
}
try {
 const content = await (await fetch(base + '/assets/education/music-bank-120.json')).json();
 const worlds=(process.env.QA_WORLDS||'past,present,future,fantasy').split(',');assert.ok(worlds.every(id=>['past','present','future','fantasy'].includes(id)));
 for (const world of worlds) {
  const { page, context,bundle } = await open(), grade = ['past', 'future'].includes(world) ? '3-4' : '5-6';
  const result = { world, grade,bundle }; report.worlds.push(result);
  try {
   await start(page, world, grade);
   if (world === 'past') {
    await page.locator('#notebook').click(); assert.ok(await page.locator('#paused').getAttribute('open') !== null); assert.ok(await page.locator('.notebook').getAttribute('open') !== null);
    await page.keyboard.press('a'); await page.locator('.notebook [aria-label="닫기"]').click(); await page.locator('#resume').click(); result.pausedForNotebook = true;
   }
   await page.evaluate(() => window.__gameQA.start());
   await page.waitForTimeout(3000); await page.screenshot({ path: out + world + '-game.png' });
   await page.waitForFunction(() => document.getElementById('results').open, null, { timeout: 120000 }); await page.evaluate(() => window.__gameQA.stop());
   result.stats = await page.locator('#stats').textContent(); assert.ok(result.stats.includes('처치 4/4'), result.stats);
   result.judges = await page.evaluate(() => window.__gameQA.judges);
   const fields = page.locator('#quiz fieldset'); assert.equal(await fields.count(), 5); result.items = [];
   for (let i = 0; i < 5; i++) {
    const field = fields.nth(i), id = await field.getAttribute('data-question-id'), q = content.questions.find(q => q.id === id);
    assert.equal(q.grade, grade); result.items.push({ id, kind: q.kind });
    for (let j = 0; j < (q.audio || []).length; j++) { const play = field.locator('.sound-row button').nth(j); await play.click(); await page.waitForFunction(id => document.querySelector(`[data-question-id="${id}"] .sound-row button[data-state=playing]`), id); await play.click(); }
    await field.locator(`input[value="${q.correct}"]`).check();
   }
   assert.equal(new Set(result.items.map(q => q.kind)).size, 3);
   await page.waitForFunction(() => !document.querySelector('#quiz .notation:not([data-ready=true])'));
   await page.locator('#answer').click(); result.quiz = await page.locator('#explanation').textContent(); assert.ok(result.quiz.includes('5/5'), result.quiz);
   await fields.first().locator('.lesson-link').click(); assert.ok(await page.locator('.notebook .notebook-body h3').isVisible()); await page.locator('.notebook [aria-label="닫기"]').click();
   await page.locator('#answer').click(); assert.ok((await page.locator('#explanation').textContent()).includes('5/5'));
   await page.screenshot({ path: out + world + '-result.png' }); result.pass = true;
  } finally { await context.close(); await writeFile(out + 'game-browser-report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(result)); }
 }
 const { page, context,bundle } = await open(true), cdp = await context.newCDPSession(page); report.touch = {bundle};
 try {
  await start(page, 'future', '3-4', 'explore');
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  const point = (x, y, id = 1) => ({ x, y, id, radiusX: 3, radiusY: 3, force: 1 });
  const pads = await page.locator('[data-lane]').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  const p1 = point(pads[0].x, pads[0].y), p2 = point(pads[1].x, pads[1].y, 2);
  await send('touchStart', [p1]); await send('touchStart', [p1, p2]); await page.waitForTimeout(70);
  report.touch.held = await page.locator('[data-lane].down').count(); assert.equal(report.touch.held, 2); await send('touchEnd', []);
  for (const early of [false, true]) {
   await page.waitForFunction(() => window.__gameQA.heads.some(n => n.body > 25 && n.y > 75 && n.y < 285 && !n.white), null, { timeout: 20000 });
   const target = await page.evaluate(() => { const n = window.__gameQA.heads.find(n => n.body > 25 && n.y > 75 && n.y < 285 && !n.white), r = document.getElementById('notes').getBoundingClientRect(); return { ...n, x: r.left + n.x / 240 * r.width, y: r.top + n.y / 360 * r.height }; });
   const before = await page.evaluate(() => ({ ...window.__gameQA.judges })); await send('touchStart', [point(target.x, target.y)]); await page.waitForTimeout(80);
   assert.ok(await page.evaluate(lane => window.__gameQA.heads.some(n => n.lane === lane && n.white), target.lane));
   if (early) { await send('touchEnd', []); await page.waitForTimeout(300); assert.ok(await page.evaluate(n => (window.__gameQA.judges.MISS || 0) > n, before.MISS || 0)); report.touch.earlyRelease = true; }
   else { await page.waitForFunction(n => (window.__gameQA.judges['HOLD!'] || 0) > n, before['HOLD!'] || 0, { timeout: 9000 }); await send('touchEnd', []); report.touch.holdComplete = true; }
  }
  report.touch.trusted = await page.evaluate(() => window.__gameQA.input.filter(e => e.pointerType === 'touch').every(e => e.trusted)); assert.ok(report.touch.trusted);
  await page.locator('#notebook').tap(); assert.ok(await page.locator('.notebook').isVisible()); await page.screenshot({ path: out + 'touch-notebook.png' });
 } finally { await cdp.detach(); await context.close(); }
 assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally { report.finished = new Date().toISOString(); await writeFile(out + 'game-browser-report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify({ pass: report.pass, worlds: report.worlds.length, touch: report.touch, errors: report.errors, failure: report.failure })); await browser.close(); }
