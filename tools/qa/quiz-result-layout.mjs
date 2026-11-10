import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out='output/note-knights/result-layout/';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={diagnosticOnly:true,scope:'Real QuizPanel and app CSS, isolated layout fixture; not a game completion test.',cases:[]};
try{
 const page=await browser.newPage({viewport:{width:320,height:740}});await page.goto(process.env.QA_URL||'http://127.0.0.1:5206');
 await page.evaluate(async()=>{
  const {QuizPanel,evaluateQuiz}=await import('/src/quest/quizPanel.ts'),{QuizAudio}=await import('/src/quest/quizAudio.ts'),{INSTRUMENT_ASSETS}=await import('/src/quest/bank/audioAssets.ts'),{QUESTIONS}=await import('/src/quest/bank/index.ts');
  window.__layoutQuestions=QUESTIONS;window.__layoutGrade=evaluateQuiz;window.__layoutPanel=new QuizPanel(document.getElementById('quiz'),new QuizAudio(INSTRUMENT_ASSETS),()=>{});
  document.getElementById('ending').textContent='이 세계의 음악을 되찾았어요!';document.getElementById('stats').textContent='수집률 100% · 최고 콤보 114 · 처치 4/4';document.getElementById('results').showModal();
 });
 let failed=false;
 for(const width of[320,390,768]){
  await page.setViewportSize({width,height:width===768?1024:844});
  const count=await page.evaluate(()=>window.__layoutQuestions.length);
  for(let i=0;i<count;i++){
   await page.evaluate(i=>{window.__layoutPanel.render([window.__layoutQuestions[i]]);},i);
   await page.waitForFunction(()=>!document.querySelector('#quiz .notation:not([data-ready=true])'));await page.evaluate(()=>document.fonts.ready);
   // Isolate layout without pretending that the listening sample was played.
   await page.evaluate(i=>{const q=window.__layoutQuestions[i],wrong=(q.correct+1)%q.choices.length;document.querySelector(`#quiz input[value="${wrong}"]`).checked=true;const graded=window.__layoutGrade([q],[wrong]),feedback=document.querySelector('#quiz .question-feedback');feedback.hidden=false;feedback.textContent=graded.items[0].text;feedback.dataset.correct='false';},i);
   const row=await page.locator('#results').evaluate(d=>{const r=d.getBoundingClientRect();return{id:d.querySelector('fieldset').dataset.questionId,width:innerWidth,client:d.clientWidth,scroll:d.scrollWidth,scores:[...d.querySelectorAll('.score-viewport')].map(e=>({viewport:e.clientWidth,svg:e.querySelector('svg').getBoundingClientRect().width})),overflow:[...d.querySelectorAll('*')].filter(e=>!e.closest('svg')).map(e=>({tag:e.tagName,class:e.className,text:e.textContent?.slice(0,90),x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,client:e.clientWidth,scroll:e.scrollWidth})).filter(e=>e.right>r.right+1||e.x<r.x-1)};});
   report.cases.push(row);if(row.scroll>row.client||row.scores.some(s=>s.svg>s.viewport+1)){failed=true;await page.screenshot({path:out+`${width}-${row.id}.png`});console.log(JSON.stringify({id:row.id,width,client:row.client,scroll:row.scroll,scores:row.scores}));}
   if(row.id==='visual-56-melody-revise'){
    await page.screenshot({path:out+`${width}-comparison.png`});const zoom=page.locator('#quiz .visual-zoom').first(),viewport=page.locator('#quiz .score-viewport').first();await zoom.click();
    assert.equal(await zoom.getAttribute('aria-pressed'),'true');const enlarged=await viewport.evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,svg:e.querySelector('svg').getBoundingClientRect().width}));assert.ok(enlarged.svg>=650&&enlarged.scroll>enlarged.client);await zoom.click();assert.equal(await zoom.getAttribute('aria-pressed'),'false');const normal=await viewport.evaluate(e=>({client:e.clientWidth,svg:e.querySelector('svg').getBoundingClientRect().width}));assert.ok(normal.svg<=normal.client+1);row.zoomPreserved=true;
   }
  }
 }
 assert.equal(failed,false,'Result dialog overflows horizontally; see diagnostic descendants');report.pass=true;
}finally{await writeFile(out+'report.json',JSON.stringify(report,null,2));await browser.close();}
