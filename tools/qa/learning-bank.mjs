import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const base = process.env.QA_URL || 'http://127.0.0.1:5206';
const initialWidth=Number(process.env.QA_WIDTH||1440);
assert.ok(Number.isInteger(initialWidth)&&initialWidth>=320&&initialWidth<=3840,'Invalid QA width');
const tag=process.env.QA_TAG||'';if(tag&&!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid QA tag');
const out = 'output/note-knights/learning-120/'+(tag?tag+'/':'');
await mkdir(out, { recursive: true });
const report = { base, started: new Date().toISOString(), items: [], audio: [], errors: [], layouts: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-background-timer-throttling'] });
try {
 const page = await browser.newPage({ viewport: { width: initialWidth, height: initialWidth<768?844:900 }, hasTouch: true });
 page.on('pageerror', error => report.errors.push(error.message));
 await page.addInitScript(() => {
  window.__voices = [];
  window.__meters = [];
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
   if(destination instanceof AudioDestinationNode){const meter=this.context.createAnalyser();meter.fftSize=1024;connect.call(this,meter);connect.call(meter,destination);window.__meters.push(meter);return destination;}
   return connect.call(this,destination,...args);
  };
  const original = BaseAudioContext.prototype.createBufferSource;
  BaseAudioContext.prototype.createBufferSource = function () {
   const source = original.call(this), record = { starts: 0, stops: 0, ended: false };
   const start = source.start.bind(source), stop = source.stop.bind(source);
   source.start = (...args) => { record.starts++; return start(...args); };
   source.stop = (...args) => { record.stops++; return stop(...args); };
   source.addEventListener('ended', () => record.ended = true); window.__voices.push(record); return source;
  };
 });
 await page.goto(base);
 const bank = await page.evaluate(async () => {
  const { QUESTIONS, LESSONS, ACTIVITIES } = await import('/src/quest/bank/index.ts');
  return { questions: QUESTIONS, lessons: LESSONS, activities: ACTIVITIES };
 });
 assert.equal(bank.questions.length, 96); assert.equal(bank.activities.length, 24);
 await page.locator('#notebook').click();
 const book = page.locator('.notebook'), selects = book.locator('select');
 const next = book.getByRole('button', { name: '다음', exact: true });
 async function fits(id){
  const dimensions=await book.locator('.notebook-body').evaluate(e=>({width:e.clientWidth,content:e.scrollWidth,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(dimensions.content<=dimensions.width+1&&dimensions.pageWidth<=dimensions.viewport,`${id}: ${JSON.stringify(dimensions)}`);
 }
 async function readyPictures() {
  await page.waitForFunction(() => !document.querySelector('.notebook .notation:not([data-ready=true])'));
  assert.equal(await book.locator('.notation[data-error=true]').count(), 0);
  assert.equal(await book.locator('svg').evaluateAll(es => es.filter(e => e.innerHTML.includes('NaN')).length), 0);
 }
 for (const grade of ['3-4', '5-6']) {
  await selects.nth(0).selectOption(grade); await selects.nth(1).selectOption('');
  await book.getByRole('tab', { name: '문제', exact: true }).click();
  const pool = bank.questions.filter(q => q.grade === grade);
  for (const [index, q] of pool.entries()) {
   const field = book.locator('fieldset'); assert.equal(await field.getAttribute('data-question-id'), q.id);
   await readyPictures();
   const item = { id: q.id, grade, kind: q.kind, scores: await field.locator('.notation[data-ready=true]').count(), clips: [] };
   for (const [i, clip] of (q.audio || []).entries()) {
    const play = field.locator('.sound-row button').nth(i); await play.click();
    await page.waitForFunction(i => document.querySelectorAll('.notebook .sound-row button')[i]?.dataset.state === 'playing', i);
    item.clips.push(clip.id); await play.click(); assert.equal(await play.getAttribute('data-state'), 'idle');
   }
   const confirm=book.getByRole('button',{name:'확인',exact:true}),feedback=field.locator('.question-feedback');
   if(initialWidth<=390){
    item.wrongChoices=[];
    for(const i of q.choices.keys()){
     if(i===q.correct)continue;
     await field.locator(`input[value="${i}"]`).check();await confirm.click();
     assert.equal(await feedback.getAttribute('data-correct'),'false');
     assert.ok((await feedback.textContent()).includes(q.misconceptions[i]),`${q.id}: missing feedback for choice ${i}`);
     await fits(q.id+'/wrong-'+i);item.wrongChoices.push(i);
    }
   }
   await field.locator(`input[value="${q.correct}"]`).check(); await confirm.click();
   assert.equal(await feedback.getAttribute('data-correct'), 'true');
   assert.ok((await feedback.textContent()).includes(q.why));
   await fits(q.id);
   report.items.push(item);
   if (q.id === 'visual-56-rest-dot' || q.id === 'listen-34-timbre-1') await page.screenshot({ path: out + q.id + '.png' });
   if (index < pool.length - 1) await next.click();
  }
  assert.equal(await next.isDisabled(), true);
  await book.getByRole('tab', { name: '배우기', exact: true }).click();
  for (let i = 0; i < bank.lessons.length; i++) {
   await readyPictures(); assert.ok((await book.locator('.notebook-body').innerText()).includes(bank.lessons[i].levels[grade].intro));
   await fits(bank.lessons[i].id+'/'+grade);
   if (i < bank.lessons.length - 1) await next.click();
  }
  await book.getByRole('tab', { name: '활동', exact: true }).click();
  const activities = bank.activities.filter(a => a.grade === grade);
  for (const [i, activity] of activities.entries()) {
   assert.ok((await book.locator('.notebook-body').innerText()).includes(activity.task));
   assert.ok(await book.locator('input[type=checkbox]').count() >= 2);
   await fits(activity.id);
   await book.locator('input[type=checkbox]').first().check();
   if (i < activities.length - 1) await next.click();
  }
 }
 // Offline rendering uses the production scheduler with real decoded recordings.
 report.audio = await page.evaluate(async () => {
  const { QUESTIONS } = await import('/src/quest/bank/index.ts');
  const { INSTRUMENT_ASSETS } = await import('/src/quest/bank/audioAssets.ts');
  const { QuizAudio } = await import('/src/quest/quizAudio.ts');
  const rows = [];
  for (const q of QUESTIONS.filter(q => q.kind === 'listening')) for (const clip of q.audio) {
   const seconds = Math.max(...clip.events.map(e => (e.beat + e.duration) * 60 / clip.bpm)) + .2;
   const offline = new OfflineAudioContext(1, Math.ceil(seconds * 44100), 44100);
   const proxy = { state: 'running', currentTime: 0, destination: offline.destination, createGain: () => offline.createGain(), createBufferSource: () => offline.createBufferSource(), decodeAudioData: bytes => offline.decodeAudioData(bytes) };
   const player = new QuizAudio(INSTRUMENT_ASSETS, () => proxy); const states = [];
   await player.play(clip, state => states.push(state));
   const rendered = await offline.startRendering(), data = rendered.getChannelData(0);
   let peak = 0, sum = 0; for (const sample of data) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
   const rms = Math.sqrt(sum / data.length); player.stop();
   const eventRms=clip.events.map(e=>{const start=Math.floor((.05+e.beat*60/clip.bpm)*44100),end=Math.min(data.length,start+Math.floor(Math.min(e.duration,.5)*60/clip.bpm*44100));let energy=0;for(let i=start;i<end;i++)energy+=data[i]**2;return Math.sqrt(energy/Math.max(1,end-start));});
   const eventOnsets=clip.events.map(e=>{const start=Math.floor((.04+e.beat*60/clip.bpm)*44100),end=Math.min(data.length,start+Math.floor(.12*44100));for(let i=start;i<end;i++)if(Math.abs(data[i])>peak*.05)return i/44100;return null;});
   rows.push({ id: clip.id, instrument: clip.instrument, seconds, peak, rms, states,eventRms,eventOnsets });
  }
  return rows;
 });
 assert.ok(report.audio.length >= 60);
 assert.ok(report.audio.every(a => a.peak > .001 && a.peak < .9 && a.rms > .0001 && a.states.includes('playing')));
 for(const [id,increasing]of[['listen-56-dynamics-1-a',true],['listen-56-dynamics-2-a',false]]){const row=report.audio.find(a=>a.id===id);for(let i=1;i<row.eventRms.length;i++)assert.ok(increasing?row.eventRms[i]>row.eventRms[i-1]:row.eventRms[i]<row.eventRms[i-1]);}
 const slowing=report.audio.find(a=>a.id==='listen-56-tempo-2-a').eventOnsets;assert.ok(slowing.every(Number.isFinite));for(let i=2;i<slowing.length;i++)assert.ok(slowing[i]-slowing[i-1]>slowing[i-1]-slowing[i-2]);
 report.liveAudio=[];
 for(const instrument of ['piano','flute','violin','trumpet','clarinet','cello']){
  const q=bank.questions.find(q=>q.lessonId==='timbre'&&q.audio?.some(c=>c.instrument===instrument));
  await selects.nth(0).selectOption(q.grade);await selects.nth(1).selectOption('timbre');await book.getByRole('tab',{name:'문제',exact:true}).click();
  while(await book.locator('fieldset').getAttribute('data-question-id')!==q.id)await next.click();
  await book.locator('.sound-row button').nth(q.audio.findIndex(c=>c.instrument===instrument)).click();
  const peak=await page.evaluate(async()=>{let peak=0;for(let n=0;n<24;n++){for(const meter of window.__meters){const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);for(const sample of data)peak=Math.max(peak,Math.abs(sample));}await new Promise(r=>setTimeout(r,25));}return peak;});
  assert.ok(peak>.001&&peak<.9,`${instrument} live peak ${peak}`);report.liveAudio.push({instrument,peak});
 }
 for (const [width, height, label] of [[1440, 900, 'desktop'], [1024, 768, 'tablet-landscape'], [768, 1024, 'tablet-portrait'], [390, 844, 'mobile']]) {
  await page.setViewportSize({ width, height }); await selects.nth(0).selectOption('3-4'); await selects.nth(1).selectOption('rest'); await book.getByRole('tab', { name: '문제', exact: true }).click(); await readyPictures();
  const layout = await page.evaluate(() => { const d = document.querySelector('.notebook'), r = d.getBoundingClientRect(); return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, dialog: { x: r.x, y: r.y, right: r.right, bottom: r.bottom }, bodyOverflow: d.querySelector('.notebook-body').scrollWidth > d.querySelector('.notebook-body').clientWidth + 1 }; });
  assert.ok(layout.scrollWidth <= width && layout.scrollHeight <= height && !layout.bodyOverflow); assert.ok(layout.dialog.x >= 0 && layout.dialog.y >= 0 && layout.dialog.right <= width && layout.dialog.bottom <= height);
  report.layouts.push({ label, ...layout }); await page.screenshot({ path: out + label + '-verified.png' });
 }
 // Fixed time-grid comparisons must remain unbroken even on a narrow phone.
 report.comparisonRows=[];
 await selects.nth(0).selectOption('5-6');await selects.nth(1).selectOption('gugak');await book.getByRole('tab',{name:'문제',exact:true}).click();
 while(await book.locator('fieldset').getAttribute('data-question-id')!=='visual-56-gugak-hanbae')await next.click();
 for(const [width,height]of[[320,740],[390,844],[768,1024]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
  const rows=await book.locator('.music-rows span').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,width:e.clientWidth,content:e.scrollWidth,whiteSpace:getComputedStyle(e).whiteSpace})));
  assert.equal(rows.length,2);assert.ok(rows.every(r=>r.content<=r.width&&r.whiteSpace==='pre'));assert.ok(Math.abs(rows[0].x-rows[1].x)<1);
  report.comparisonRows.push({width,rows});await page.screenshot({path:out+`hanbae-${width}.png`});
 }
 await page.setViewportSize({width:320,height:740});
 await selects.nth(0).selectOption('3-4');
 while(await book.locator('fieldset').getAttribute('data-question-id')!=='concept-34-gugak')await next.click();
 await book.locator('fieldset .lesson-link').click();
 assert.ok((await book.locator('.notebook-body').innerText()).includes(bank.lessons.find(l=>l.id==='gugak').levels['3-4'].intro));
 await fits('gugak-linked-lesson');
 await book.getByRole('button',{name:'돌아가기',exact:true}).click();
 assert.equal(await book.locator('fieldset').getAttribute('data-question-id'),'concept-34-gugak');
 report.lessonLinkReturns=true;
 await book.getByRole('button', { name: '닫기', exact: true }).click();
 assert.equal(await page.locator('dialog[open]').count(), 0);
 // Failed and cancelled loads must not become late sound or a scored wrong answer.
 const failure = await browser.newPage({ viewport: { width: 1024, height: 768 } });
 failure.on('pageerror', error => report.errors.push(error.message)); await failure.goto(base); await failure.locator('#notebook').click();
 const fbook = failure.locator('.notebook'); await fbook.locator('select').nth(1).selectOption('pitch'); await fbook.getByRole('tab', { name: '문제', exact: true }).click();
 while ((await fbook.locator('fieldset').getAttribute('data-kind')) !== 'listening') await fbook.getByRole('button', { name: '다음', exact: true }).click();
 await failure.route('**/quiz-v1/flute.wav', route => route.fulfill({ status: 404, body: 'test missing sample' }));
 await fbook.locator('input[value="0"]').check(); await fbook.locator('.sound-row button').first().click();
 await failure.waitForFunction(() => document.querySelector('.notebook .sound-row button').dataset.state === 'error');
 await fbook.getByRole('button', { name: '확인', exact: true }).click();
 report.failedLoad = await fbook.locator('[role=status]').last().textContent(); assert.ok(report.failedLoad.includes('불러오지 못한')); assert.equal(await fbook.locator('.question-feedback:not([hidden])').count(), 0);
 await failure.unroute('**/quiz-v1/flute.wav'); await fbook.locator('.sound-row button').first().click(); await failure.waitForFunction(() => document.querySelector('.notebook .sound-row button').dataset.state === 'playing');
 report.retry = true;
 await fbook.getByRole('button',{name:'다음',exact:true}).click();
 await failure.route('**/quiz-v1/violin.wav',async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue();});
 await fbook.locator('input[value="0"]').check();await fbook.locator('.sound-row button').first().click();
 await failure.waitForFunction(()=>document.querySelector('.notebook .sound-row button').dataset.state==='loading');
 await fbook.getByRole('button',{name:'확인',exact:true}).click();
 assert.equal(await fbook.locator('.question-feedback:not([hidden])').count(),0);
 assert.ok((await fbook.locator('[role=status]').last().textContent()).includes('먼저 재생'));
 await failure.waitForTimeout(1700);assert.equal(await fbook.locator('.sound-row button').first().getAttribute('data-state'),'idle');
 report.cancelledLoadingNotGraded=true;
 await fbook.getByRole('button', { name: '닫기', exact: true }).click();
 assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally { await writeFile(out + 'bank-browser-report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify({ pass: report.pass, questions: report.items.length, clips: report.audio.length, layouts: report.layouts.length, errors: report.errors, failure: report.failure })); await browser.close(); }
