import type{PressResult}from'../engine/game';
import type{RuntimeNote}from'../types';
export function holdForInput(result:PressResult,notes:RuntimeNote[],lane:number,noteId?:string){
 if(result?.kind==='holding')return result.noteId;
 const target=result?.kind==='popped'?undefined:noteId;
 return notes.find(n=>n.lane===lane&&n.holding&&!n.completed&&(!target||n.id===target))?.id;
}
export class LaneInput{
 private sources=new Map<string,number>();
 private impulses=Array<number>(5).fill(-Infinity);
 down(lane:number,source:string,time:number){
  if(!Number.isInteger(lane)||lane<0||lane>=5||!Number.isFinite(time)||this.sources.has(source))return false;
  this.sources.set(source,lane);this.impulses[lane]=time;
  return true;
 }
 up(source:string){this.sources.delete(source);}
 clear(){this.sources.clear();this.impulses.fill(-Infinity);}
 sample(lane:number,time:number){
  const held=[...this.sources.values()].includes(lane);
  const age=Math.max(0,time-this.impulses[lane]);
  return{held,energy:Math.max(held?.58:0,Math.max(0,1-age/160))};
 }
}
