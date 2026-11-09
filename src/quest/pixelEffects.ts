import {frameIndex}from './feedback';
export const FX_PATHS={hit:'impacts/hit-spark',perfect:'impacts/crit-hit','hold-loop':'arcane/rune-circle','hold-end':'lightning/zap-hit',combo:'arcane/mana-burst',boss:'spawn/poof','theater-perfect':'theater/impacts/crit-hit','theater-rune':'theater/arcane/rune-circle','theater-hold':'theater/lightning/zap-hit','theater-combo':'theater/arcane/mana-burst',
 'present-perfect':'present/impacts/crit-hit','present-rune':'present/arcane/rune-circle','present-hold':'present/lightning/zap-hit','present-combo':'present/arcane/mana-burst',
 'future-perfect':'future/impacts/crit-hit','future-rune':'future/arcane/rune-circle','future-hold':'future/lightning/zap-hit','future-combo':'future/arcane/mana-burst',
 'fantasy-perfect':'fantasy/impacts/crit-hit','fantasy-rune':'fantasy/arcane/rune-circle','fantasy-hold':'fantasy/lightning/zap-hit','fantasy-combo':'fantasy/arcane/mana-burst'}as const;
export type EffectId=keyof typeof FX_PATHS;
interface Frame{x:number;y:number;w:number;h:number}
interface Sheet{image:HTMLImageElement;frames:Frame[];fps:number;loop:boolean;pivot:[number,number]}
const sheets=new Map<EffectId,Sheet>(),pending=new Map<EffectId,Promise<void>>();
function load(id:EffectId):Promise<void>{
 if(typeof Image==='undefined')return Promise.resolve();
 const old=pending.get(id);if(old)return old;
 const path=FX_PATHS[id],name=path.split('/').at(-1),base='/assets/pixelfx-v5/'+path+'/'+name;
 const promise=(async()=>{
  try{
   const image=new Image();image.src=base+'.png';
   const response=await fetch(base+'.json');if(!response.ok)return;
   const data=await response.json();await image.decode();
   const meta=data.meta.pixelfx;
   sheets.set(id,{image,frames:Object.values(data.frames as Record<string,{frame:Frame}>).map(f=>f.frame),fps:meta.fps,loop:meta.loop,pivot:meta.pivot});
  }catch{/* Gameplay remains functional if an optional effect cannot load. */}
 })();pending.set(id,promise);
 void promise.then(()=>{if(!sheets.has(id)&&pending.get(id)===promise)pending.delete(id);});
 return promise;
}
export class PixelEffects{
 readonly ready=this.preload(['hit','perfect','hold-loop','hold-end','combo','boss','theater-perfect','theater-rune','theater-hold','theater-combo']);
 preload(ids:readonly EffectId[]){return Promise.all(ids.map(load));}
 draw(ctx:CanvasRenderingContext2D,id:EffectId,age:number,x:number,y:number,scale=1,reduced=false,alpha=1){
  const sheet=sheets.get(id);if(!sheet||age<0)return false;
  const duration=sheet.frames.length/sheet.fps;if(!sheet.loop&&age>=duration)return false;
  const index=frameIndex(reduced?(sheet.loop ? .7 : .1):age,sheet.fps,sheet.frames.length,sheet.loop);
  if(index===null)return false;
  const frame=sheet.frames[index];ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sheet.image,frame.x,frame.y,frame.w,frame.h,Math.round(x-sheet.pivot[0]*scale),Math.round(y-sheet.pivot[1]*scale),Math.round(frame.w*scale),Math.round(frame.h*scale));ctx.restore();return true;
 }
}
