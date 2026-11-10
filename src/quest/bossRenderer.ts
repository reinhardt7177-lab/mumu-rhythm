import{BOSS_THEMES,bossState,type BossWorld}from'./boss';
import type{Combat,MusicalAttack}from'./combat';
import{spriteRect,type Point}from'./sceneLayout';
const p=(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)};
function line(c:CanvasRenderingContext2D,a:Point,b:Point,color:string){const count=Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))/3);for(let i=0;i<=count;i++)p(c,a.x+(b.x-a.x)*i/Math.max(1,count),a.y+(b.y-a.y)*i/Math.max(1,count),2,2,color)}
function star(c:CanvasRenderingContext2D,x:number,y:number,color:string){p(c,x-4,y,9,2,color);p(c,x,y-4,2,9,color);}
function note(c:CanvasRenderingContext2D,x:number,y:number,color:string){p(c,x,y,7,5,'#201b31');p(c,x+1,y+1,5,3,color);p(c,x+5,y-9,2,13,color);p(c,x+7,y-9,5,2,color)}
export class BossRenderer{
 private images=new Map(Object.entries(BOSS_THEMES).map(([id,t])=>{const image=new Image();image.src=t.sprite;return[id,image]as const}));
 readonly ready=Promise.allSettled([...this.images.values()].map(image=>image.decode()));
 private entered:number|undefined;
 private phaseBeat=0;
 private phase=-1;
 private hitAt=-Infinity;
 private breakAt=-Infinity;
 private deadAt:number|undefined;
 cue='';
 reset(){this.entered=undefined;this.phase=-1;this.phaseBeat=0;this.hitAt=this.breakAt=-Infinity;this.deadAt=undefined;this.cue='';}
 impact(attacks:MusicalAttack[]){for(const a of attacks)if(a.target===3){this.hitAt=a.at;if(a.skill&&!a.defeated)this.breakAt=a.at;if(a.defeated)this.deadAt=a.at;}}
 draw(c:CanvasRenderingContext2D,id:BossWorld,time:number,beat:number,combat:Combat,anchor:Point,hero:Point,reduced:boolean){
  const theme=BOSS_THEMES[id],image=this.images.get(id),ratio=combat.hp/combat.maxHp,phase=ratio>.65?0:ratio>.3?1:2;
  if(this.entered===undefined){this.entered=time;this.phaseBeat=beat;}
  if(this.phase!==phase){this.phase=phase;this.phaseBeat=beat;}
  const s=bossState(beat-this.phaseBeat,ratio,time-this.breakAt,time-this.hitAt),base=bossState(beat-this.phaseBeat,ratio);
  const action=s.action==='broken'||s.action==='defeated'?s.action:base.action;
  this.cue=combat.hp<=0?'화음의 봉인이 풀렸어요':`${phase+1}악장 · ${theme.movements[phase]} · ${action==='charge'?'화음 충전':action==='cast'?theme.patterns[phase]:action==='broken'?'화음 봉인 파괴':'공명'}`;
  if(!image?.naturalWidth)return false;
  if(combat.hp<=0&&this.deadAt===undefined)this.deadAt=time;
  const deadAge=this.deadAt===undefined?0:time-this.deadAt;
  if(combat.hp<=0&&deadAge>.8)return true;
  c.save();c.imageSmoothingEnabled=false;
  c.globalAlpha=.28;
  if(combat.hp>0)for(let ring=0;ring<=phase;ring++)for(let i=0;i<48;i++){
   const a=i/48*Math.PI*2+(reduced?0:time*.25)*(ring%2?-1:1),rx=46+ring*11,ry=12+ring*6;
   p(c,anchor.x+Math.cos(a)*rx,anchor.y-40+Math.sin(a)*ry,2,2,ring%2?theme.secondary:theme.primary);
  }
  c.globalAlpha=Math.min(1,Math.max(0,(time-this.entered)/.35));
  if(combat.hp<=0)c.globalAlpha*=Math.max(0,1-deadAge/.8);
  const r=spriteRect(anchor,176);c.drawImage(image,s.frame%4*128,Math.floor(s.frame/4)*128,128,128,Math.round(r.x),Math.round(r.y),176,176);
  c.globalAlpha=1;
  if(action==='charge'){
   const charge=reduced?.65:base.charge;
   for(let i=0;i<3+phase*2;i++){
    const a=i/(3+phase*2)*Math.PI*2+(reduced?0:time),radius=42-charge*20;
    star(c,anchor.x-18+Math.cos(a)*radius,anchor.y-78+Math.sin(a)*radius*.65,i%2?theme.secondary:theme.primary);
   }
   p(c,anchor.x-32,anchor.y-132,64,4,'#201a30');p(c,anchor.x-31,anchor.y-131,Math.round(62*charge),2,theme.primary);
  }
  if(action==='cast'){
   const u=Math.max(0,Math.min(1,(base.at/base.cycle-.7)/.15));
   for(let voice=0;voice<3+phase*2;voice++){
    const rank=voice-(1+phase),x=anchor.x-36-(anchor.x-hero.x-52)*u;
    const y=anchor.y-70+(hero.y-anchor.y)*u+Math.sin(u*Math.PI)*rank*18;
    for(let trail=1;trail<=4;trail++){c.globalAlpha=.5-trail*.09;p(c,x+trail*8,y,4,2,theme.secondary)}c.globalAlpha=1;
    if(id==='past')note(c,x,y,theme.primary);
    else if(id==='present'){for(let bar=0;bar<3;bar++)p(c,x+bar*4,y-bar*3,2,5+bar*3,bar%2?theme.secondary:theme.primary)}
    else if(id==='future'){line(c,{x:x-7,y},{x,y:y-7},theme.primary);line(c,{x,y:y-7},{x:x+7,y},theme.secondary);line(c,{x:x+7,y},{x,y:y+7},theme.primary);line(c,{x,y:y+7},{x:x-7,y},theme.secondary)}
    else{star(c,x,y,theme.primary);line(c,{x:x+12,y},{x,y},theme.secondary)}
   }
   if(phase>0){c.globalAlpha=.35;for(let staff=0;staff<5;staff++)line(c,{x:anchor.x-35,y:anchor.y-87+staff*7},{x:hero.x+20,y:hero.y-87+staff*7},theme.secondary);c.globalAlpha=1;}
  }
  const brokenAge=time-this.breakAt;
  if(brokenAge>=0&&brokenAge<.6){
   c.globalAlpha=1-brokenAge/.6;const r=reduced?40:24+brokenAge*90;
   for(let i=0;i<12;i++){const a=i/12*Math.PI*2;p(c,anchor.x+Math.cos(a)*r,anchor.y-65+Math.sin(a)*r*.7,3,4,i%2?theme.secondary:theme.primary)}
   c.globalAlpha=1;c.font='13px NeoPixel,monospace';c.textAlign='center';c.strokeStyle='#201b31';c.lineWidth=3;c.strokeText('화음 봉인 파괴!',anchor.x-15,anchor.y-145);c.fillStyle=theme.primary;c.fillText('화음 봉인 파괴!',anchor.x-15,anchor.y-145);
  }
  c.restore();return true;
 }
}
