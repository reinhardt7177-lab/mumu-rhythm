import{describe,it,expect}from'vitest';
import{evaluateQuiz}from'./quizPanel';
import type{BankQuestion}from'./bank/types';
const qs=[{id:'picture',kind:'visual',correct:1,choices:[{text:'가'},{text:'나'},{text:'다'}],why:'두 음의 길이를 정확히 비교해요.',misconceptions:['소리의 수와 길이를 혼동했어요.','잘했어요.','기준 길이를 다시 살펴요.']},{id:'sound',kind:'listening',correct:0,choices:[{text:'피아노'},{text:'플루트'},{text:'바이올린'}],why:'줄을 두드리는 피아노의 소리예요.',misconceptions:['잘했어요.','바람 소리와 비교해요.','활로 켜는 소리와 비교해요.']}]as BankQuestion[];
describe('educational quiz grading',()=>{
 it('requires all choices without marking unanswered items as wrong',()=>{expect(evaluateQuiz(qs,[1,null])).toMatchObject({ready:false,reason:'unanswered'});});
 it('does not grade an unavailable audio or picture stimulus as a wrong answer',()=>{expect(evaluateQuiz(qs,[1,2],new Set(['sound']))).toMatchObject({ready:false,reason:'unavailable'});});
 it('uses the actual question count and explains a specific misconception',()=>{
  const r=evaluateQuiz(qs,[1,2]);expect(r.ready).toBe(true);if(!r.ready)return;
  expect(r.count).toBe(1);expect(r.total).toBe(2);expect(r.items[1].text).toContain('활로 켜는 소리');expect(r.items[1].text).toContain('피아노');
 });
 it('allows a corrected answer to earn full credit on the next attempt',()=>{const r=evaluateQuiz(qs,[1,0]);expect(r).toMatchObject({ready:true,count:2,total:2});});
});
