import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const engines = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const engine=process.env.QA_ENGINE||'chromium';assert.ok(['chromium','webkit'].includes(engine));
const base = process.env.QA_URL || 'https://mumu-rhythm.vercel.app';
const tag=process.env.QA_TAG||'';if(tag&&!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid QA tag');
const out = 'output/note-knights/learning-120/production-audit/'+(tag?tag+'/':'')+(engine==='webkit'?'webkit/':'');
await mkdir(out + 'glyphs/', { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { base,engine, started: new Date().toISOString(), scenarios: [], assets: [], errors: [], limitations: ['Tablet touch emulation, not physical iPad/Android hardware or the installed mobile browser app.', 'Audio signal and scheduling verification, not a human timbre/quality review or external speaker recording.'] };
async function fetchRemote(url){for(let attempt=0;attempt<3;attempt++){try{return await fetch(url);}catch(error){(report.networkRetries??=[]).push({url,attempt:attempt+1,cause:String(error.cause??error)});if(attempt===2)throw error;await new Promise(r=>setTimeout(r,500*(attempt+1)));}}}
const save = () => writeFile(out + 'report.json', JSON.stringify(report, null, 2));
const browser = await engines[engine].launch(engine==='chromium'?{ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] }:{headless:true,...(process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{})});report.browser=browser.version();
function observe() {
 const a = window.__prodAudit = { active: '', meters: [], voices: [], samples: [], inputs: [] };
 for (const type of ['pointerdown', 'pointerup', 'pointercancel']) document.addEventListener(type, e => a.inputs.push({ type, trusted: e.isTrusted, pointerType: e.pointerType }), true);
 if(typeof AudioNode==='undefined'||typeof BaseAudioContext==='undefined')return;
 const connect = AudioNode.prototype.connect;
 AudioNode.prototype.connect = function (destination, ...args) {
  if (destination instanceof AudioDestinationNode) { const meter = this.context.createAnalyser(); meter.fftSize = 1024; connect.call(this, meter); connect.call(meter, destination); a.meters.push(meter); return destination; }
  return connect.call(this, destination, ...args);
 };
 const create = BaseAudioContext.prototype.createBufferSource;
 BaseAudioContext.prototype.createBufferSource = function () {
  const source = create.call(this), record = { clip: a.active, at: 0, rate: 0, stops: [], ended: false };
  const start = source.start.bind(source), stop = source.stop.bind(source);
  source.start = (...args) => { record.at = args[0] ?? this.currentTime; record.rate = source.playbackRate.value; record.bufferDuration = source.buffer.duration; a.voices.push(record); return start(...args); };
  source.stop = (...args) => { record.stops.push(args[0] ?? null); return stop(...args); };
  source.addEventListener('ended', () => record.ended = true); return source;
 };
 setInterval(() => {
  if (!a.active) return;
  for (const meter of a.meters) {
   const data = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(data); let peak = 0, sum = 0;
   for (const sample of data) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
   a.samples.push({ time: meter.context.currentTime, peak, rms: Math.sqrt(sum / data.length) });
  }
 }, 16);
}
try {
 const response = await fetchRemote(base + '/?audit=all-120-tablet'), html = await response.text(); assert.equal(response.status, 200);
 const js = html.match(/src="([^"]*quest-[^"]+\.js)"/)?.[1]; assert.ok(js); const bytes = Buffer.from(await (await fetchRemote(base + js)).arrayBuffer());
 const localHtml = await readFile('dist/index.html', 'utf8'), localJs = localHtml.match(/src="([^"]*quest-[^"]+\.js)"/)[1];
 assert.equal(hash(bytes), hash(await readFile('dist' + localJs)), 'Production code differs from the reviewed local build'); report.bundle = { path: js, sha256: hash(bytes) };
 const bankBytes = Buffer.from(await (await fetchRemote(base + '/assets/education/music-bank-120.json')).arrayBuffer());
 assert.equal(hash(bankBytes), hash(await readFile('public/assets/education/music-bank-120.json'))); const bank = JSON.parse(bankBytes.toString());
 assert.equal(bank.questions.length, 96); assert.equal(bank.activities.length, 24); assert.equal(bank.lessons.length, 12);
 for (const asset of bank.instrumentAssets) {
  const r = await fetchRemote(base + asset.url), bytes = Buffer.from(await r.arrayBuffer()); assert.equal(r.status, 200); assert.equal(hash(bytes), hash(await readFile('public' + asset.url))); report.assets.push({ id: asset.id, bytes: bytes.length, sha256: hash(bytes) });
 }
 const orientations=(process.env.QA_ORIENTATIONS||'tablet-landscape,tablet-portrait').split(',');assert.ok(orientations.every(x=>['tablet-landscape','tablet-portrait'].includes(x)));
 for (const [name, width, height] of [['tablet-landscape', 1024, 768], ['tablet-portrait', 768, 1024]].filter(x=>orientations.includes(x[0]))) {
  const scenario = { name, width, height, items: [], activities: [], lessons: [], glyphs: [], clips: [], layouts: [] }; report.scenarios.push(scenario);
  const context = await browser.newContext({...(engine==='webkit'?engines.devices['iPad Pro 11']:{}), viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', e => report.errors.push(e.message)); await page.addInitScript(observe);
  try {
   await page.goto(base + '/?audit=' + name);
   scenario.capabilities=await page.evaluate(()=>({AudioContext:typeof AudioContext,AudioNode:typeof AudioNode,BaseAudioContext:typeof BaseAudioContext,OfflineAudioContext:typeof OfflineAudioContext}));
   const unsupported=scenario.capabilities.AudioContext!=='function'||scenario.capabilities.AudioNode!=='function';
   if(unsupported){assert.equal(process.env.QA_PARTIAL_ON_UNSUPPORTED,'1','This test engine lacks Web Audio; do not report audio verification');scenario.audioUnsupported='Web Audio APIs absent in this installed engine; not a physical Safari result';scenario.skippedListening=[];}
   await page.locator('#notebook').tap();
   const book = page.locator('.notebook'), selects = book.locator('select'), next = book.getByRole('button', { name: '다음', exact: true });
   async function pictures(id) {
    await page.waitForFunction(() => !document.querySelector('.notebook .notation:not([data-ready=true])'));
    assert.equal(await book.locator('.notation[data-error=true]').count(), 0);
    const shapes = await book.locator('.notation svg').evaluateAll(es => es.map(svg => {
     const v=svg.viewBox.baseVal,ctx=document.createElement('canvas').getContext('2d'),inverse=svg.getCTM().inverse();const points=[];
     // SVG text getBBox includes Bravura's large em box, not its painted glyph.
     for(const element of svg.querySelectorAll('text,path,line,rect,polygon,polyline,circle,ellipse')){
      let b=element.getBBox();
      if(element.tagName==='text'){ctx.font=getComputedStyle(element).font;const m=ctx.measureText(element.textContent),x=element.x.baseVal[0]?.value??0,y=element.y.baseVal[0]?.value??0;b={x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};}
      const matrix=inverse.multiply(element.getCTM());for(const[x,y]of[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]]){const p=svg.createSVGPoint();p.x=x;p.y=y;points.push(p.matrixTransform(matrix));}
     }
     const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));
     return {view:[v.width,v.height],ink:[x,y,right-x,bottom-y],bad:svg.innerHTML.includes('NaN'),label:svg.getAttribute('aria-label'),fontLoaded:document.fonts.check('32px Bravura')};
    }));
    for (const s of shapes) { assert.ok(!s.bad && s.fontLoaded && s.ink[2] > 0 && s.ink[3] > 0); assert.ok(s.ink[0] >= -2 && s.ink[1] >= -2 && s.ink[0] + s.ink[2] <= s.view[0] + 2 && s.ink[1] + s.ink[3] <= s.view[1] + 2, `Clipped score ${id}: ${JSON.stringify(s)}`); }
    if (name === 'tablet-landscape') for (let i = 0; i < shapes.length; i++) { const path = `glyphs/${id.replace(/[^a-z0-9-]/g, '_')}-${i}.png`; await book.locator('.notation svg').nth(i).screenshot({ path: out + path }); scenario.glyphs.push({ id, index: i, path, geometry: shapes[i] }); }
    return shapes.length;
   }
   async function layout(id) {
    const state = await page.evaluate(() => { const d = document.querySelector('.notebook'), b = d.querySelector('.notebook-body'), r = d.getBoundingClientRect(); return { documentOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight, bodyOverflow: b.scrollWidth > b.clientWidth + 1, inside: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
    assert.ok(!state.documentOverflow && !state.bodyOverflow && state.inside, 'Overflow: ' + id); scenario.layouts.push({ id, ...state });
   }
   async function listen(field, clip, index) {
    await page.evaluate(id => { const a = window.__prodAudit; a.active = id; a.voices = []; a.samples = []; }, clip.id);
    const button = field.locator('.sound-row button').nth(index); await button.tap();
    await page.waitForFunction(i => ['playing', 'error'].includes(document.querySelectorAll('.notebook .sound-row button')[i]?.dataset.state), index);
    assert.equal(await button.getAttribute('data-state'), 'playing', clip.id);
    await page.waitForFunction(i => document.querySelectorAll('.notebook .sound-row button')[i]?.dataset.state === 'idle', index, { timeout: 20000 });
    const signal = await page.evaluate(() => { const a = window.__prodAudit; a.active = ''; return { voices: a.voices, samples: a.samples }; });
    const expected = clip.events.flatMap(e => (Array.isArray(e.midi) ? e.midi : [e.midi]).map(midi => ({ ...e, midi })));
    assert.equal(signal.voices.length, expected.length, clip.id); const asset = bank.instrumentAssets.find(a => a.id === clip.instrument), seconds = 60 / clip.bpm;
    const anchor = signal.voices[0].at - expected[0].beat * seconds;
    signal.voices.forEach((v, i) => { assert.ok(v.ended, clip.id + ' voice not ended'); assert.ok(Math.abs(v.at - anchor - expected[i].beat * seconds) < .0001, clip.id + ' onset scheduling'); assert.ok(Math.abs(v.rate - 2 ** ((expected[i].midi - asset.rootMidi) / 12)) < .0001, clip.id + ' pitch'); });
    const peak = Math.max(...signal.samples.map(s => s.peak)), rms = Math.max(...signal.samples.map(s => s.rms)); assert.ok(peak > .001 && peak < .9 && rms > .0001, `Silent/clipped audio ${clip.id}: ${peak}/${rms}`);
    const eventPeaks = clip.events.map(e => Math.max(0, ...signal.samples.filter(s => s.time >= anchor + e.beat * seconds + .016 && s.time <= anchor + e.beat * seconds + .24).map(s => s.peak)));
    if (/listen-56-dynamics-[12]-a/.test(clip.id)) for (let i = 1; i < eventPeaks.length; i++) assert.ok(clip.id.includes('dynamics-1') ? eventPeaks[i] > eventPeaks[i - 1] : eventPeaks[i] < eventPeaks[i - 1], 'Audible dynamics direction');
    const result = { id: clip.id, instrument: clip.instrument, peak, rms, sampledWindows: signal.samples.length, voices: signal.voices, eventPeaks }; scenario.clips.push(result); return result;
   }
   for (const grade of ['3-4', '5-6']) {
    await selects.nth(0).selectOption(grade); await selects.nth(1).selectOption(''); await book.getByRole('tab', { name: '문제', exact: true }).tap();
    const pool = bank.questions.filter(q => q.grade === grade);
    for (const [index, q] of pool.entries()) {
     const field = book.locator('fieldset'); assert.equal(await field.getAttribute('data-question-id'), q.id); const count = await pictures(q.id);
     assert.equal(count, [q.visual, ...q.choices.map(c => c.visual)].filter(v => v?.kind === 'score').length, q.id);
     await layout(q.id);
     if(unsupported&&q.kind==='listening'){assert.equal(await field.locator('.sound-row button').count(),q.audio.length);scenario.skippedListening.push(q.id);if(index<pool.length-1)await next.tap();continue;}
     if (q.id === 'visual-34-duration-equivalent') { const zoom = field.locator('.visual-zoom').first(); await zoom.tap(); assert.equal(await zoom.getAttribute('aria-pressed'), 'true'); await zoom.tap(); assert.equal(await zoom.getAttribute('aria-pressed'), 'false'); }
     await book.getByRole('button', { name: '확인', exact: true }).tap(); assert.ok(await field.locator('.question-feedback').isHidden());
     for (const [i, clip] of (q.audio || []).entries()) await listen(field, clip, i);
     const wrong = (q.correct + 1) % q.choices.length;
     await field.locator('.answer-option label').nth(wrong).tap(); assert.ok(await field.locator(`input[value="${wrong}"]`).isChecked()); await book.getByRole('button', { name: '확인', exact: true }).tap();
     assert.equal(await field.locator('.question-feedback').getAttribute('data-correct'), 'false'); assert.ok((await field.locator('.question-feedback').textContent()).includes(q.misconceptions[wrong]));
     await field.locator('.answer-option label').nth(q.correct).tap(); await book.getByRole('button', { name: '확인', exact: true }).tap(); assert.equal(await field.locator('.question-feedback').getAttribute('data-correct'), 'true'); assert.ok((await field.locator('.question-feedback').textContent()).includes(q.why));
     scenario.items.push({ id: q.id, grade, kind: q.kind, scores: count, unanswered: true, wrongFeedback: true, corrected: true });
     if (['visual-34-rest-space', 'visual-56-rest-dot', 'listen-56-timbre-1', 'listen-56-dynamics-1'].includes(q.id)) await page.screenshot({ path: out + name + '-' + q.id + '.png' });
     if (scenario.items.length % 8 === 0) { console.log(JSON.stringify({ name, questions: scenario.items.length, clips: scenario.clips.length })); await save(); }
     if (index < pool.length - 1) await next.tap();
    }
    await book.getByRole('tab', { name: '배우기', exact: true }).tap();
    for (const [i, lesson] of bank.lessons.entries()) { const text = await book.locator('.notebook-body').innerText(); for (const key of ['intro', 'example', 'guide', 'pitfall']) assert.ok(text.includes(lesson.levels[grade][key])); await pictures('lesson-' + grade + '-' + lesson.id); await layout('lesson-' + grade + '-' + lesson.id); scenario.lessons.push({ grade, id: lesson.id }); if (i < bank.lessons.length - 1) await next.tap(); }
    await book.getByRole('tab', { name: '활동', exact: true }).tap(); const activities = bank.activities.filter(a => a.grade === grade);
    for (const [i, activity] of activities.entries()) { const text = await book.locator('.notebook-body').innerText(); for (const part of [activity.task, ...activity.steps, ...activity.checkpoints, activity.reflection]) assert.ok(text.includes(part)); const check = book.locator('input[type=checkbox]').first(); await check.tap(); assert.ok(await check.isChecked()); await layout(activity.id); scenario.activities.push({ grade, id: activity.id }); if (i < activities.length - 1) await next.tap(); }
   }
   assert.equal(scenario.items.length, unsupported?56:96); assert.equal(scenario.activities.length, 24); assert.equal(scenario.clips.length, unsupported?0:60); assert.equal(scenario.lessons.length, 24);
   const inputs = await page.evaluate(() => window.__prodAudit.inputs); scenario.touch = { down: inputs.filter(e => e.type === 'pointerdown' && e.pointerType === 'touch').length, allTrusted: inputs.every(e => e.trusted) }; assert.ok(scenario.touch.down > 300 && scenario.touch.allTrusted);
   scenario.pass = !unsupported;scenario.visualAndConceptPass=true; console.log(JSON.stringify({ name, pass: scenario.pass, questions: scenario.items.length, activities: 24, clips: scenario.clips.length,audioUnsupported:scenario.audioUnsupported }));
  } finally { await context.close(); await save(); }
 }
 assert.deepEqual(report.errors, []); report.pass = report.scenarios.every(s=>s.pass);report.partial=report.scenarios.some(s=>s.audioUnsupported);
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally { report.finished = new Date().toISOString(); await save(); await browser.close(); console.log(JSON.stringify({ pass: report.pass, scenarios: report.scenarios.map(s => ({ name: s.name, questions: s.items.length, activities: s.activities.length, clips: s.clips.length, pass: s.pass })), errors: report.errors, failure: report.failure })); }
