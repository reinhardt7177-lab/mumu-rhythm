import type{MusicalAttack}from'./combat';
import{FLIGHT_SECONDS}from'./combat';
import{ACTOR_WINDUP_SECONDS}from'./actors';
import{theaterPose}from'./theaterAttack';
import{WORLD_THEMES,worldAttack,worldFlightPoint,type ThemeWorld}from'./worldAttack';
import{spriteRect}from'./sceneLayout';
type Point={x:number;y:number};
function pixel(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))}
function line(c:CanvasRenderingContext2D,a:Point,b:Point,color:string,width=1){const n=Math.max(1,Math.ceil(Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y))/2));for(let i=0;i<=n;i++)pixel(c,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,width,width,color)}
function ring(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){for(let i=0;i<40;i++){const a=i/40*Math.PI*2;pixel(c,x+Math.cos(a)*rx,y+Math.sin(a)*ry,2,2,color)}}
function star(c:CanvasRenderingContext2D,x:number,y:number,size:number,color:string){pixel(c,x-size,y-1,size*2+1,3,color);pixel(c,x-1,y-size,3,size*2+1,color);pixel(c,x-2,y-2,5,5,color)}
function glyph(c:CanvasRenderingContext2D,id:ThemeWorld,p:Point,color:string,size=1){
 const dark=WORLD_THEMES[id].shadow;
 if(id==='present'){
  for(let bar=0;bar<3;bar++){const h=[6,12,9][bar]*size,x=p.x+(bar-1)*4*size;pixel(c,x-1,p.y-h-1,4*size,h+3,dark);pixel(c,x,p.y-h,2*size,h,color)}
  pixel(c,p.x-6*size,p.y+2,12*size,2,color);
 }else if(id==='future'){
  const s=7*size;line(c,{x:p.x-s,y:p.y},{x:p.x,y:p.y-s},dark,3);line(c,{x:p.x,y:p.y-s},{x:p.x+s,y:p.y},dark,3);line(c,{x:p.x+s,y:p.y},{x:p.x,y:p.y+s},color,2);line(c,{x:p.x,y:p.y+s},{x:p.x-s,y:p.y},color,2);pixel(c,p.x-2,p.y-2,5,5,'#f4ffff');
 }else{
  line(c,{x:p.x-10*size,y:p.y},{x:p.x+7*size,y:p.y},dark,3);line(c,{x:p.x-10*size,y:p.y},{x:p.x+7*size,y:p.y},color,1);star(c,p.x+7*size,p.y,3*size,color);pixel(c,p.x-2,p.y-8*size,2,9*size,color);pixel(c,p.x,p.y-8*size,5*size,2,color);
 }
}
export class WorldRenderer{
 private images=new Map(Object.entries(WORLD_THEMES).map(([id,theme])=>{const image=new Image();image.src=theme.sprite;return[id,image]as const}));
 readonly ready=Promise.allSettled([...this.images.values()].map(image=>image.decode()));
 hero(c:CanvasRenderingContext2D,id:ThemeWorld,time:number,attack:MusicalAttack|undefined,holding:boolean,anchor:Point,reduced:boolean){
  const image=this.images.get(id);if(!image?.naturalWidth)return false;
  const age=attack?time-attack.time:10,profile=worldAttack(id,attack?.combo??0);
  const frame=theaterPose(age,profile,holding,!!attack?.hold);
  const shift=!reduced&&age>=.08&&age<.28?(profile.accent?4:2):0,r=spriteRect({x:anchor.x+shift,y:anchor.y},128);
  if(profile.cadence&&!reduced&&age>=.08&&age<.28){
   for(let echo=2;echo>0;echo--){c.globalAlpha=.15/echo;c.drawImage(image,frame%4*128,Math.floor(frame/4)*128,128,128,Math.round(r.x-echo*10),Math.round(r.y),128,128)}c.globalAlpha=1;
  }
  c.drawImage(image,frame%4*128,Math.floor(frame/4)*128,128,128,Math.round(r.x),Math.round(r.y),128,128);return true;
 }
 charge(c:CanvasRenderingContext2D,id:ThemeWorld,time:number,anchor:Point,reduced:boolean){
  const theme=WORLD_THEMES[id],t=reduced?0:time;
  if(id==='present'){
   for(let bar=0;bar<7;bar++){const h=6+Math.round((Math.sin(t*4+bar)+1)*9);pixel(c,anchor.x-24+bar*8,anchor.y-h,4,h,bar%2?theme.primary:theme.secondary)}
  }else if(id==='future'){
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2+t*1.5;glyph(c,id,{x:anchor.x+Math.cos(a)*25,y:anchor.y-46+Math.sin(a)*13},i%2?theme.primary:theme.secondary,.45)}
  }else{
   for(let i=0;i<5;i++){const p=(t*.5+i/5)%1;star(c,anchor.x+Math.cos(i*2.4+t)*18,anchor.y-20-p*47,2,i%2?theme.primary:theme.secondary)}
  }
 }
 flight(c:CanvasRenderingContext2D,id:ThemeWorld,time:number,attack:MusicalAttack,hero:Point,enemy:Point,reduced:boolean){
  const age=time-attack.time;if(age<ACTOR_WINDUP_SECONDS||age>=FLIGHT_SECONDS)return;
  const p=(age-ACTOR_WINDUP_SECONDS)/(FLIGHT_SECONDS-ACTOR_WINDUP_SECONDS),profile=worldAttack(id,attack.combo),theme=WORLD_THEMES[id];
  const from={x:hero.x+35,y:hero.y-48},to={x:enemy.x-8,y:enemy.y-48};
  if(attack.hold){
   const tip={x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p};
   if(id==='future'){line(c,from,tip,theme.secondary,6);line(c,from,tip,theme.primary,3);line(c,from,tip,'#f2ffff',1)}
   else for(let strand=0;strand<5;strand++)for(let sample=0;sample<24;sample++){
    const q=sample/24*p,x=from.x+(to.x-from.x)*q,y=from.y+(to.y-from.y)*q;
    const wave=id==='present'?Math.sin(q*26)*(5+strand*2):(strand-2)*Math.sin(q*Math.PI)*9;
    pixel(c,x,y+wave,3,1,strand%2?theme.primary:theme.secondary);
   }
  }
  for(let voice=0;voice<profile.voices;voice++){
   const color=voice%2?theme.secondary:theme.primary,point=worldFlightPoint(id,p,voice,profile,from,to);
   for(let trail=1;trail<=6;trail++){const tail=worldFlightPoint(id,Math.max(0,p-trail*.06),voice,profile,from,to);c.globalAlpha=(1-trail/7)*.65;pixel(c,tail.x,tail.y,3,2,color)}
   c.globalAlpha=1;glyph(c,id,point,color,profile.accent?1.4:1);
  }
  if(profile.accent&&profile.tier>=1){
   c.globalAlpha=.55;
   if(id==='present')for(let i=0;i<18;i++){const x=from.x+i/18*(to.x-from.x)*p,h=5+Math.sin(i*2+(reduced?0:time*5))*7;pixel(c,x,from.y-h,3,h+9,theme.secondary)}
   else if(id==='future'){line(c,{x:from.x,y:from.y-14},{x:from.x+(to.x-from.x)*p,y:to.y-14},theme.secondary);line(c,{x:from.x,y:from.y+14},{x:from.x+(to.x-from.x)*p,y:to.y+14},theme.primary)}
   else for(let strand=0;strand<3;strand++)for(let i=0;i<20;i++){const q=i/20*p;pixel(c,from.x+(to.x-from.x)*q,from.y-Math.sin(q*Math.PI)*(24+strand*9),3,1,strand%2?theme.secondary:theme.primary)}
   c.globalAlpha=1;
  }
 }
 impact(c:CanvasRenderingContext2D,id:ThemeWorld,age:number,attack:MusicalAttack,anchor:Point,reduced:boolean,titleY=76){
  const profile=worldAttack(id,attack.combo),theme=WORLD_THEMES[id],life=profile.finale?1.05:.7;if(age<0||age>=life)return;
  const x=anchor.x,y=anchor.y-48,t=reduced?.18:age,alpha=1-age/life;c.globalAlpha=alpha;
  if(id==='present'){
   ring(c,x,y,14+t*65,12+t*45,theme.primary);
   if(profile.tier>=1)ring(c,x,y,21+t*80,17+t*58,theme.secondary);
   if(profile.tier>=2)for(let i=0;i<7;i++){const h=(10+[7,20,34,46,34,20,7][i])*(reduced?1:Math.min(1,age/.08));pixel(c,x-33+i*10,anchor.y+4-h,5,h,i%2?theme.primary:theme.secondary)}
   if(profile.tier>=3)for(const side of[-1,1]){const sx=x+side*48;pixel(c,sx-10,y-18,20,36,theme.shadow);pixel(c,sx-8,y-16,16,32,theme.primary);ring(c,sx,y+4,6,6,theme.shadow);ring(c,sx,y-8,3,3,theme.shadow)}
  }else if(id==='future'){
   ring(c,x,y,18+t*55,9+t*25,theme.primary);
   const count=profile.tier>=2?3:2,points:Point[]=[];
   for(let i=0;i<count;i++){const a=i/count*Math.PI*2+(reduced?0:age*3),r=25+profile.tier*5+t*25,p={x:x+Math.cos(a)*r,y:y+Math.sin(a)*r};points.push(p);glyph(c,id,p,i%2?theme.primary:theme.secondary,.7)}
   if(profile.tier>=2)for(let i=0;i<points.length;i++)line(c,points[i],points[(i+1)%points.length],theme.secondary);
   if(profile.tier>=3)for(const sx of[-1,1])for(const sy of[-1,1]){const p={x:x+sx*53,y:y+sy*37};line(c,p,{x:p.x-sx*17,y:p.y},theme.primary,2);line(c,p,{x:p.x,y:p.y-sy*13},theme.secondary,2)}
  }else{
   const count=profile.tier>=3?8:profile.tier>=2?5:3;
   for(let i=0;i<count;i++){const a=i/count*Math.PI*2+(reduced?0:age*1.6),r=16+t*(profile.tier>=2?95:65);star(c,x+Math.cos(a)*r,y+Math.sin(a)*r*.8,profile.tier>=2?4:2,i%2?theme.primary:theme.secondary)}
   if(profile.tier>=2)for(let i=0;i<3;i++){const a=i/3*Math.PI*2;glyph(c,id,{x:x+Math.cos(a)*32,y:y+Math.sin(a)*32},theme.primary,1.2)}
   if(profile.tier>=3)for(let i=0;i<8;i++){const a=i/8*Math.PI*2,px=x+Math.cos(a)*(38+t*30),py=y+Math.sin(a)*(38+t*30);line(c,{x:px,y:py},{x:px+Math.cos(a+.7)*10,y:py+Math.sin(a+.7)*10},'#a0e6af',3)}
   if(profile.tier>=3){
    for(let string=0;string<5;string++)line(c,{x:x-22+string*11,y:y-33},{x:x-27+string*13,y:y+30},string%2?theme.secondary:theme.primary);
    for(let i=0;i<28;i++){const a=Math.PI+i/27*Math.PI;pixel(c,x+Math.cos(a)*34,y-29+Math.sin(a)*15,3,2,theme.primary)}
    line(c,{x:x-30,y:y+31},{x:x+29,y:y+31},theme.primary,3);
   }
  }
  if(profile.cadence){
   const reach=40+(reduced?0:age*65);
   if(id==='present'){
    ring(c,x,y,reach,reach*.65,theme.secondary);
    for(let i=0;i<9;i++){const h=(18+Math.sin(i*.8+age*5)*14)*(reduced?1:Math.min(1,age/.1));pixel(c,x-52+i*13,anchor.y+8-h,7,h,i%2?theme.primary:theme.secondary)}
   }else if(id==='future'){
    const nodes=Array.from({length:6},(_,i)=>({x:x+Math.cos(i/6*Math.PI*2)*reach,y:y+Math.sin(i/6*Math.PI*2)*reach*.75}));
    for(let i=0;i<nodes.length;i++){line(c,nodes[i],nodes[(i+2)%nodes.length],theme.secondary);glyph(c,id,nodes[i],theme.primary,.8)}
   }else{
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;glyph(c,id,{x:x+Math.cos(a)*reach,y:y+Math.sin(a)*reach*.7},i%2?theme.primary:theme.secondary,.85)}
    for(let string=0;string<5;string++)line(c,{x:x-53,y:y-26+string*12},{x:x+53,y:y-26+string*12},theme.secondary);
   }
   if(!profile.finale){c.textAlign='center';c.font='13px NeoPixel,monospace';c.strokeStyle=theme.shadow;c.lineWidth=4;c.strokeText('카덴차 · 화음 연격',240,titleY);c.fillStyle=theme.primary;c.fillText('카덴차 · 화음 연격',240,titleY)}
  }
  if(profile.finale&&attack.kind!=='boss'){
   c.textAlign='center';c.font='13px NeoPixel,monospace';c.lineWidth=4;c.strokeStyle=theme.shadow;const title=`${attack.combo} COMBO · ${theme.finale}`;c.strokeText(title,240,titleY);c.fillStyle=theme.primary;c.fillText(title,240,titleY);
  }
  c.globalAlpha=1;
 }
}
