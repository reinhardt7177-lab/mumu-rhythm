import{describe,it,expect}from'vitest';
import{LaneInput,holdForInput}from'./laneInput';
import type{RuntimeNote}from'../types';
describe('immediate lane input independent of judgments',()=>{
 it('lights an empty lane immediately and stays held until release',()=>{
  const input=new LaneInput();input.down(2,'KeyD',100);
  expect(input.sample(2,100)).toEqual({held:true,energy:1});
  expect(input.sample(2,1000).held).toBe(true);expect(input.sample(1,1000).energy).toBe(0);
  input.up('KeyD');expect(input.sample(2,1200)).toEqual({held:false,energy:0});
 });
 it('does not retrigger repeated down events or release another source on the same lane',()=>{
  const input=new LaneInput();input.down(0,'key',0);input.down(0,'key',500);
  expect(input.sample(0,500).energy).toBeLessThan(1);
  input.down(0,'touch',500);input.up('key');expect(input.sample(0,800).held).toBe(true);
  input.up('touch');expect(input.sample(0,800).held).toBe(false);
 });
 it('clears impulses and all held sources and ignores invalid lanes',()=>{
  const input=new LaneInput();input.down(7,'bad',0);input.down(1,'valid',0);input.clear();
  for(let lane=0;lane<5;lane++)expect(input.sample(lane,0)).toEqual({held:false,energy:0});
 });
 it('adopts an active hold even when the same-lane second source also pops a tap',()=>{
  const notes=[{id:'held',lane:1,holding:true,completed:false}]as RuntimeNote[];
  expect(holdForInput({kind:'popped',noteId:'tap',judge:'GOOD'},notes,1,'tap')).toBe('held');
  expect(holdForInput(null,notes,2)).toBeUndefined();
  expect(holdForInput({kind:'holding',noteId:'new-hold',judge:'GOOD'},notes,1)).toBe('new-hold');
 });
});
