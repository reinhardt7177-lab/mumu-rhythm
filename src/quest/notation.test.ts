import{describe,it,expect,vi}from'vitest';
import{scoreBeats,notationLabel,engravingKeys,visualElement}from'./notation';
import type{Visual}from'./bank/types';
describe('educational notation semantics',()=>{
 it('preserves explicit temporal rows rather than squeezing them into parallel narrow cells',()=>{
  const make=()=>({className:'',children:[]as unknown[],setAttribute(){},append(...children:unknown[]){this.children.push(...children);}});
  vi.stubGlobal('document',{createElement:make});
  try{const figure=visualElement({kind:'labels',cells:['앞: 덩 · 쿵','뒤: 덩 쿵'],layout:'rows'}as Visual)as unknown as ReturnType<typeof make>;expect((figure.children[0]as ReturnType<typeof make>).className).toBe('music-cells music-rows');}
  finally{vi.unstubAllGlobals();}
 });
 it('uses the engraver rest sentinel so whole rests hang from the correct line',()=>{expect(engravingKeys({duration:'w',rest:true})).toEqual(['r/4']);expect(engravingKeys({duration:'h',rest:true})).toEqual(['r/4']);});
 it('counts durations and rests using quarter-note units, including dots',()=>{
  expect(scoreBeats([{duration:'q'},{duration:'q',rest:true},{duration:'h'}])).toBe(4);
  expect(scoreBeats([{duration:'q',dots:1},{duration:'8'}])).toBe(2);
  expect(scoreBeats([{duration:'h',dots:2}])).toBe(3.5);
 });
 it('describes visible shapes without announcing note names or the correct answer',()=>{
  const label=notationLabel({kind:'score',notes:[{duration:'8'},{duration:'q',rest:true}]});
  expect(label).toContain('꼬리1개');expect(label).toContain('쉼표');expect(label).not.toMatch(/8분음표|4분쉼표|정답/);
 });
 it('preserves literal diagram labels and simultaneous notehead counts',()=>{
  expect(notationLabel({kind:'labels',cells:['A','B','A']})).toContain('A, B, A');
  expect(notationLabel({kind:'score',notes:[{duration:'q',keys:['c/4','e/4','g/4']}]})).toContain('3개');
 });
 it('distinguishes staff positions without revealing solfege',()=>{
  const label=notationLabel({kind:'score',notes:[{duration:'q',keys:['b/4']},{duration:'q',keys:['c/5']},{duration:'q',keys:['c/4']}]});
  expect(label).toContain('3번째 줄');expect(label).toContain('3번째 칸');expect(label).toContain('아래 1번째 덧줄');expect(label).not.toContain('도');
 });
});
