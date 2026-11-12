import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const out = 'output/note-knights/library-levels';
const base = process.env.QA_URL || 'http://127.0.0.1:5212/';
const report = { base, cases: [], errors: [] };
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
let expected;
try {
  const { MUSIC_LIBRARY } = await vite.ssrLoadModule('/src/quest/catalog.ts');
  const { CHART_LEVELS, chartForLevel } = await vite.ssrLoadModule('/src/content/musicalChart.ts');
  expected = await Promise.all(MUSIC_LIBRARY.map(async ({ song, worldId }) => ({ id: song.id, worldId, levels: await Promise.all(CHART_LEVELS.map(async level => {
    const { melody } = await chartForLevel(song, level);
    return { level, count: melody.length, first: melody.filter(note => note.beat === melody[0].beat).map(note => note.lane) };
  })) })));
} finally { await vite.close(); }

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  assert.equal(expected.length, 16);
  const selected = process.env.QA_SONGS ? expected.filter(song => process.env.QA_SONGS.split(',').includes(song.id)) : expected;
  assert.ok(selected.length);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.addInitScript(() => {
    window.firstBars = [];
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function(x, y, w, h) {
      if (this.canvas.id === 'notes' && w === 38 && h === 10 &&
          ['#81e6d0', '#ff92ad', '#ffe39a', '#b8e491', '#b7b5ff'].includes(this.fillStyle)) {
        window.firstBars.push(Math.floor(x / 48));
      }
      return fill.call(this, x, y, w, h);
    };
  });
  await page.goto(base);
  const seen = new Set();
  for (const [index, song] of selected.entries()) {
    const summary = [];
    for (const [step, chart] of song.levels.entries()) {
      const width = (index + step) % 2 ? 320 : 1440;
      await page.setViewportSize({ width, height: width === 320 ? 740 : 900 });
      const activate = locator => width === 320 ? locator.tap() : locator.click();
      await activate(page.locator(`[data-song="${song.id}"]`));
      await activate(page.locator('#openBriefing'));
      const levels = page.locator('#chartLevels'), button = levels.locator(`[data-chart-level="${chart.level}"]`);
      assert.equal(await levels.locator('button:visible').count(), 3);
      await activate(button);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await levels.locator('[aria-pressed=true]').count(), 1);
      assert.ok(await levels.locator('button').evaluateAll(buttons => buttons.every(b => b.scrollWidth <= b.clientWidth + 1)));
      if (!seen.has(`brief-${width}`)) {
        await levels.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${out}/brief-${width}.png` });
        seen.add(`brief-${width}`);
      }
      await page.evaluate(() => { window.firstBars.length = 0; });
      await activate(page.locator('#start'));
      await page.waitForFunction(() => document.querySelector('.quest').dataset.screen === 'game' && window.firstBars.length);
      const lane = await page.evaluate(() => window.firstBars[0]);
      assert.ok(chart.first.includes(lane), `${song.id}/${chart.level}: first lane ${lane} vs ${chart.first}`);
      assert.match(await page.locator('#playingTitle').textContent(), [ /초급/, /중급/, /고급/ ][step]);
      if (!seen.has(`${song.worldId}-${chart.level}`)) {
        await page.screenshot({ path: `${out}/${song.worldId}-${chart.level}.png` });
        seen.add(`${song.worldId}-${chart.level}`);
      }
      report.cases.push({ song: song.id, width, ...chart, lane });
      summary.push(chart.count);
      await activate(page.locator('#home'));
    }
    console.log(`${song.id}: ${summary.join(' / ')}`);
  }
  assert.equal(report.cases.length, selected.length * 3);
  assert.deepEqual(report.errors, []);
  report.pass = true;
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
