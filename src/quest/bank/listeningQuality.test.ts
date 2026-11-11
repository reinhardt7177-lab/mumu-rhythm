import{describe,it,expect}from'vitest';
import{LISTENING_QUESTIONS as questions}from'./listeningQuestions';
import type{Visual}from'./types';
import registryText from'../../../public/assets/audio/quiz-v1/manifest.json?raw';
const get=(id:string)=>questions.find(q=>q.id===id)!;
const pattern=(v:Visual|undefined)=>v?.kind==='score'?v.notes.map(n=>({w:4,h:2,q:1,'8':.5,'16':.25}[n.duration])*(2-2**-(n.dots??0))):[];
describe('listening item quality, not only playback',()=>{
 it('uses neutral answer captions and one uniquely matching score for heard rhythm',()=>{
  for(const id of['listen-34-rhythm-1','listen-34-rhythm-2','listen-56-rhythm-1','listen-56-rhythm-3']){
   const q=get(id),durations=q.audio![0].events.map(e=>e.duration);
   expect(q.choices.map(c=>c.text),id).toEqual(['가','나','다']);
   const matching=q.choices.map((c,i)=>JSON.stringify(pattern(c.visual))===JSON.stringify(durations)?i:-1).filter(i=>i>=0);
   expect(matching,id).toEqual([q.correct]);
  }
 });
 it('does not reveal the assessed rhythm position or length before playing',()=>{
  expect(get('listen-56-rhythm-1').prompt).not.toMatch(/첫 긴|뒤의 짧은/);
  expect(get('listen-56-rhythm-4').prompt).not.toMatch(/첫 박은 한 소리|반 박씩 나뉘는 두 박/);
 });
 it('anchors all rest judgments to preparation pulses and a sufficiently long piano recording',()=>{
  const registry=JSON.parse(registryText)as{samples:{id:string;sourceFrames:number;rootMidi:number}[]};
  const piano=registry.samples.find(s=>s.id==='piano')!;expect(piano.sourceFrames).toBeGreaterThan(0);
  for(const q of questions.filter(q=>q.lessonId==='rest')){
   const clip=q.audio![0];expect(clip.instrument,q.id).toBe('piano');
   expect(q.prompt,q.id).toContain('준비박');
   expect(clip.events.slice(0,4).map(e=>[e.beat,e.midi]),q.id).toEqual([[0,48],[1,48],[2,48],[3,48]]);
   for(const e of clip.events.slice(4)){const midi=Array.isArray(e.midi)?e.midi[0]:e.midi;expect(piano.sourceFrames/44100/2**((midi-piano.rootMidi)/12),q.id).toBeGreaterThanOrEqual(e.duration*60/clip.bpm);}
  }
  expect(get('listen-34-rest-1').audio![0].events.slice(4).map(e=>e.beat)).toEqual([4,6,7]);
  expect(get('listen-56-rest-1').audio![0].events.slice(4).map(e=>e.beat)).toEqual([4,4.5,6,7]);
 });
 it('explains preparation beats immediately and keeps the complete four-beat count',()=>{
  for(const q of questions.filter(q=>q.lessonId==='rest')){
   expect(q.prompt,q.id).toContain('준비박(가락 전에 박을 맞추는 소리)');
   expect(q.prompt,q.id).toContain('네 번');
   expect(q.prompt,q.id).toMatch(/한 박씩 끝까지|네 번째 준비박의 한 박을 끝까지/);
  }
 });
 it('explains supporting vocabulary without naming the heard instruments in prompts',()=>{
  for(const q of questions.filter(q=>q.lessonId==='timbre')){
   expect(q.prompt,q.id).not.toMatch(/피아노|플루트|클라리넷|바이올린|첼로|트럼펫/);
   expect(q.why,q.id).not.toContain('샘플');
  }
  for(const id of ['listen-56-timbre-1','listen-56-timbre-2','listen-56-timbre-3']){
   expect(get(id).prompt,id).toContain('악기군(악기를 종류별로 묶은 것)');
  }
  for(const id of ['listen-56-dynamics-1','listen-56-dynamics-2']){
   expect(get(id).prompt,id).toContain('셈여림(소리의 세기)');
   expect(get(id).prompt,id).toContain('기기의 소리 크기');
  }
 });
 it('makes the older-band timbre application a three-instrument grouping, not the younger matching task again',()=>{
  const q=get('listen-56-timbre-4');
  expect(q.audio!.map(c=>c.instrument)).toEqual(['piano','trumpet','flute']);
  expect(q.choices.map(c=>c.text)).toEqual(['A와 B','A와 C','B와 C']);
  expect(q.correct).toBe(2);expect(q.why).toContain('관악기');expect(q.prompt).not.toContain('피아노 기준');
 });
 it('does not claim equal acoustic length from a short transposed flute sample, or call do an absolute note name',()=>{
  expect(get('listen-34-pitch-1').prompt).not.toContain('같은 길이');
  expect(get('listen-34-pitch-1').why).not.toContain('길이와 세기는 같');
  const octave=get('listen-56-pitch-1');expect(octave.prompt).not.toContain('같은 이름의 도');expect(octave.why).toContain('다(C)');
 });
 it('requires upper-grade phrase memory across eight notes instead of repeating the short beginner pattern',()=>{
  const clip=get('listen-56-melody-2').audio![0];expect(clip.events.length).toBeGreaterThanOrEqual(8);
  expect(clip.events.at(-1)?.midi).toBe(clip.events[0].midi);expect(new Set(clip.events.map(e=>e.midi)).size).toBeGreaterThanOrEqual(4);
 });
});
