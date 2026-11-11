import {describe,it,expect} from 'vitest';
import {drawNoteBar,drawHoldRibbon} from './noteBar';
function canvas(){
 const rects:{color:string;alpha:number;x:number;y:number;w:number;h:number}[]=[];
 const c={fillStyle:'',globalAlpha:1,fillRect(x:number,y:number,w:number,h:number){rects.push({color:this.fillStyle,alpha:this.globalAlpha,x,y,w,h});}};
 return{c:c as unknown as CanvasRenderingContext2D,rects};
}
describe('pixel lightbar appearance',()=>{
 it('keeps the 38x10 face and center while stepping the outer corners',()=>{
  const{c,rects}=canvas();drawNoteBar(c,{x:5,y:95,width:38,height:10},'#81e6d0',{});
  expect(rects).toContainEqual({color:'#81e6d0',alpha:1,x:5,y:95,w:38,h:10});
  expect(rects.some(r=>r.color==='#effbff'&&r.h===1&&r.w===32)).toBe(true);
  expect(rects.every(r=>Number.isInteger(r.x)&&Number.isInteger(r.y)&&r.w>=0&&r.h>=0)).toBe(true);
  expect(rects.every(r=>r.x>=3&&r.x+r.w<=45&&r.y>=93&&r.y+r.h<=107)).toBe(true);
 });
 it('uses distinct accent endcaps and a held progress rail inside the same footprint',()=>{
  const{c,rects}=canvas();drawNoteBar(c,{x:5,y:95,width:38,height:10},'#ff92ad',{accent:true,holding:true,progress:.5});
  expect(rects.filter(r=>r.color==='#fff2b0'&&r.w===3&&r.h===4)).toHaveLength(2);
  expect(rects.some(r=>r.color==='#ffffff'&&r.w===16&&r.h===1)).toBe(true);
  expect(c.globalAlpha).toBe(1);
 });
 it('keeps a long-note ribbon bounded and adds a readable ending cap',()=>{
  const{c,rects}=canvas();drawHoldRibbon(c,{x:11,y:25,width:26,height:80},'#b7b5ff',true);
  expect(rects.some(r=>r.y===25&&r.w===20&&r.h===2)).toBe(true);
  expect(rects.every(r=>r.x>=11&&r.x+r.w<=37&&r.y>=25&&r.y+r.h<=105)).toBe(true);
  expect(c.globalAlpha).toBe(1);
 });
 it('does not paint a negative or zero-height hold tail',()=>{
  const{c,rects}=canvas();drawHoldRibbon(c,{x:11,y:25,width:26,height:0},'#b7b5ff',false);
  expect(rects).toHaveLength(0);
 });
});
