import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const base = process.env.QA_URL || 'http://127.0.0.1:5212/';
const out = 'output/note-knights/enemy-counter';
const report = { cases: [], errors: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
await mkdir(out, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.addInitScript(() => {
    const qa = window.counterQA = { flight: false, losses: [] };
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    const label = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillRect = function(x, y, w, h) {
      if (this.canvas.id === 'world' && this.fillStyle === '#ff91ab' && w === 14 && h === 10) qa.flight = true;
      return fill.call(this, x, y, w, h);
    };
    CanvasRenderingContext2D.prototype.fillText = function(value, ...args) {
      if (this.canvas.id === 'world' && /^-\d+$/.test(value)) qa.losses.push(Number(value));
      return label.call(this, value, ...args);
    };
  });
  await page.goto(base);
  const songs = await page.locator('[data-song]').evaluateAll(rows => rows.map(row => row.dataset.song));
  assert.ok(songs.length > 4);
  const worlds = new Set();
  const screenshots = new Set();
  async function check(id, mode, width, level, damage) {
    await page.setViewportSize({ width, height: width < 761 ? 740 : 900 });
    await page.locator(`[data-song="${id}"]`).click();
    await page.locator('#openBriefing').click();
    await page.locator(`[data-mode="${mode}"]`).click();
    if (level) await page.locator(`[data-chart-level="${level}"]`).click();
    const world = await page.locator('#app').getAttribute('data-world-theme');
    worlds.add(world);
    await page.evaluate(() => { window.counterQA.flight = false; window.counterQA.losses.length = 0; });
    await page.locator('#start').click();
    const energy = page.locator('#heroEnergy');
    await energy.waitFor();
    assert.equal(await energy.evaluate(e => e.value), 100);
    await page.waitForFunction(() => window.counterQA.losses.length && document.getElementById('heroEnergy').value < 100);
    const result = await page.evaluate(() => {
      const hero = document.getElementById('heroEnergy'), enemy = document.getElementById('enemyHp');
      const a = hero.getBoundingClientRect(), b = enemy.getBoundingClientRect(), lane = document.getElementById('notes').getBoundingClientRect();
      return { ...window.counterQA, energy: hero.value, enemy: enemy.value, enemyMax: enemy.max, fits: a.left >= 0 && a.right <= b.left && b.right <= innerWidth && lane.height > 0 && lane.bottom <= innerHeight };
    });
    assert.ok(result.flight && result.fits, JSON.stringify({ id, mode, width, result }));
    assert.equal(result.losses[0], -damage);
    assert.equal(result.energy, 100 - damage);
    assert.equal(result.enemy, result.enemyMax);
    const key = `${world}-${width}`;
    if (!screenshots.has(key)) { screenshots.add(key); await page.screenshot({ path: `${out}/${key}.png` }); }
    report.cases.push({ id, world, mode, width, level, loss: result.losses[0], energy: result.energy });
    await page.locator('#home').click();
    await page.locator('#library').waitFor();
  }
  for (const id of songs) {
    const level = id === 'cloud-hop' ? 'pulse' : undefined, damage = level ? 6 : 8;
    await check(id, 'challenge', 1440, level, damage);
    await check(id, 'explore', 320, level, damage);
  }
  await check('cloud-hop', 'challenge', 1440, 'groove', 8);
  await check('cloud-hop', 'challenge', 1440, 'melody', 10);
  assert.equal(worlds.size, 4);
  assert.deepEqual(report.errors, []);
  report.pass = true;
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, cases: report.cases.length, errors: report.errors }));
}
