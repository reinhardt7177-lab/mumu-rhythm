import{describe,it,expect}from'vitest';
import{QUESTIONS,LESSONS,ACTIVITIES,quizFor}from'./index';
describe('phase-one music bank',()=>{
 it('contains96 authored questions and24 activities, not repeated placement slots',()=>{
  expect(QUESTIONS).toHaveLength(96);expect(ACTIVITIES).toHaveLength(24);expect(LESSONS).toHaveLength(12);
  expect(new Set([...QUESTIONS,...ACTIVITIES].map(x=>x.id)).size).toBe(120);
  expect(QUESTIONS.filter(q=>q.kind==='visual')).toHaveLength(32);
  expect(QUESTIONS.filter(q=>q.kind==='listening')).toHaveLength(40);
  expect(QUESTIONS.filter(q=>q.kind==='concept')).toHaveLength(24);
 });
 it('links every item to a real lesson with explanations and appropriate feedback',()=>{
  for(const q of QUESTIONS){
   expect(LESSONS.some(l=>l.id===q.lessonId)).toBe(true);expect(q.prompt.length).toBeGreaterThan(8);
   expect(q.choices.length).toBeGreaterThanOrEqual(3);expect(q.correct).toBeGreaterThanOrEqual(0);expect(q.correct).toBeLessThan(q.choices.length);
   expect(q.why.length).toBeGreaterThan(15);expect(q.misconceptions).toHaveLength(q.choices.length);
   expect(new Set(q.choices.map(c=>JSON.stringify(c))).size).toBe(q.choices.length);
   if(q.kind==='visual')expect(!!q.visual||q.choices.some(c=>!!c.visual)).toBe(true);
   if(q.kind==='listening')expect(q.audio?.length).toBeGreaterThan(0);
  }
  for(const a of ACTIVITIES){expect(LESSONS.some(l=>l.id===a.lessonId)).toBe(true);expect(a.steps.length).toBeGreaterThanOrEqual(2);expect(a.checkpoints.length).toBeGreaterThanOrEqual(2);expect(a.reflection.length).toBeGreaterThan(5)}
 });
 it('selects5 mixed grade-matched questions and rotates repeated rounds',()=>{
  for(const grade of['3-4','5-6']as const){
   const first=quizFor('can-can',grade,0),next=quizFor('can-can',grade,1);
   expect(first).toHaveLength(5);expect(new Set(first.map(q=>q.id)).size).toBe(5);expect(first.every(q=>q.grade===grade)).toBe(true);
   expect(new Set(first.map(q=>q.kind)).size).toBe(3);expect(next.map(q=>q.id)).not.toEqual(first.map(q=>q.id));
   expect(quizFor('__proto__',grade,0)).toHaveLength(5);
  }
 });
 it('includes gugak and every lesson in repeated result rounds, not only song focus topics',()=>{
  for(const grade of['3-4','5-6']as const){const lessons=new Set(Array.from({length:48},(_,i)=>quizFor('can-can',grade,i)).flat().map(q=>q.lessonId));expect(lessons.size).toBe(12);expect(lessons.has('gugak')).toBe(true);}
 });
 it('does not give every world the same first result set',()=>{const sets=['can-can','cloud-hop','neon-run','william-tell'].map(id=>quizFor(id,'3-4').map(q=>q.id).join(','));expect(new Set(sets).size).toBe(4);});
});
