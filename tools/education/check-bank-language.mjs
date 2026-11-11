import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const path=process.argv[2];assert.ok(path,'Provide the pre-edit bank JSON snapshot');
const before=JSON.parse(await readFile(path,'utf8'));
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const report={reviewed:[],counts:{},limits:'Text equality checks preserve data, not pedagogical meaning; human item review and focused musical tests are also required.'};
const visual=v=>{if(!v)return v;const{caption,...rest}=v;return rest;};
const audio=clips=>clips?.map(c=>{const{label,...rest}=c;return rest;});
try{
 const{QUESTIONS,ACTIVITIES,LESSONS}=await server.ssrLoadModule('/src/quest/bank/index.ts');
 assert.equal(QUESTIONS.length,96);assert.equal(ACTIVITIES.length,24);assert.equal(LESSONS.length,12);
 assert.deepEqual(QUESTIONS.map(q=>q.id),before.questions.map(q=>q.id));
 assert.deepEqual(ACTIVITIES.map(q=>q.id),before.activities.map(q=>q.id));
 const ids=new Set();
 for(const name of['visual','listening','concept','activity']){
  const doc=await readFile('docs/education/plain-language-'+name+'-review.md','utf8');
  for(const match of doc.matchAll(/(?:visual|listen|concept|activity)-(?:34|56|[a-z]+)-(?:[a-z0-9-]+)/g))ids.add(match[0]);
 }
 for(const q of QUESTIONS){
  const old=before.questions.find(v=>v.id===q.id);assert.ok(ids.has(q.id),'Missing reviewed ID: '+q.id);
  for(const key of['id','kind','grade','lessonId','correct'])assert.equal(q[key],old[key],q.id+'/'+key);
  assert.deepEqual(visual(q.visual),visual(old.visual),q.id+'/visual');
  assert.deepEqual(audio(q.audio),audio(old.audio),q.id+'/audio');
  assert.deepEqual(q.choices.map(c=>visual(c.visual)),old.choices.map(c=>visual(c.visual)),q.id+'/choice diagrams');
  assert.equal(q.misconceptions.length,old.misconceptions.length);
  const changed=JSON.stringify(q)!==JSON.stringify(old);
  report.reviewed.push({id:q.id,kind:q.kind,grade:q.grade,changed});
 }
 for(const a of ACTIVITIES){
  const old=before.activities.find(v=>v.id===a.id);assert.ok(ids.has(a.id),'Missing reviewed ID: '+a.id);
  for(const key of['id','grade','lessonId'])assert.equal(a[key],old[key],a.id+'/'+key);
  report.reviewed.push({id:a.id,kind:'activity',grade:a.grade,changed:JSON.stringify(a)!==JSON.stringify(old)});
 }
 for(const lesson of LESSONS){
  const old=before.lessons.find(v=>v.id===lesson.id);
  for(const key of['id','standards','prerequisites'])assert.deepEqual(lesson[key],old[key],lesson.id+'/'+key);
  for(const grade of['3-4','5-6']){
   assert.deepEqual(visual(lesson.levels[grade].visual),visual(old.levels[grade].visual),lesson.id+'/'+grade+'/visual');
   assert.deepEqual(audio(lesson.levels[grade].audio),audio(old.levels[grade].audio),lesson.id+'/'+grade+'/audio');
  }
 }
 for(const kind of['visual','listening','concept','activity']){
  const rows=report.reviewed.filter(r=>r.kind===kind);report.counts[kind]={reviewed:rows.length,changed:rows.filter(r=>r.changed).length};
 }
 assert.equal(report.reviewed.length,120);report.pass=true;
 await mkdir('output/note-knights/plain-language/',{recursive:true});
 await writeFile('output/note-knights/plain-language/meaning-audit.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:report.pass,counts:report.counts}));
}finally{await server.close();}
