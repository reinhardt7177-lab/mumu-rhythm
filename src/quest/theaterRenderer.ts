import type{MusicalAttack}from'./combat';
import{FLIGHT_SECONDS}from'./combat';
import{theaterAttack,theaterPose,flightPoint}from'./theaterAttack';
import{ACTOR_WINDUP_SECONDS}from'./actors';
import{spriteRect}from'./sceneLayout';
type Point={x:number;y:number};
function pixel(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)}
function note(c:CanvasRenderingContext2D,x:number,y:number,color:string,size=1){
 pixel(c,x-4*size,y-size,9*size,6*size,'#3b2331');pixel(c,x+size,y-11*size,4*size,14*size,'#3b2331');pixel(c,x+3*size,y-11*size,7*size,4*size,'#3b2331');
 pixel(c,x-3*size,y,7*size,4*size,color);pixel(c,x+2*size,y-10*size,2*size,13*size,color);pixel(c,x+4*size,y-10*size,5*size,2*size,color);
}
export class TheaterRenderer{
 private image=new Image();
 readonly ready:Promise<unknown>;
 constructor(){this.image.src='/assets/art/theater-v6/conductor.png';this.ready=this.image.decode().catch(()=>{});}
 hero(c:CanvasRenderingContext2D,time:number,attack:MusicalAttack|undefined,holding:boolean,anchor:Point,reduced:boolean){
  if(!this.image.naturalWidth)return false;
  const age=attack?time-attack.time:10,profile=theaterAttack(attack?.combo??0);
  const frame=theaterPose(age,profile,holding,!!attack?.hold);
  const offset=!reduced&&age>=.08&&age<.28?(profile.accent?4:2):0;
  const r=spriteRect({x:anchor.x+offset,y:anchor.y},128);
  c.drawImage(this.image,frame%4*128,Math.floor(frame/4)*128,128,128,Math.round(r.x),Math.round(r.y),128,128);return true;
 }
 charge(c:CanvasRenderingContext2D,time:number,anchor:Point,reduced:boolean){
  const t=reduced?0:time;
  for(let i=0;i<5;i++){
   const p=(t*.65+i/5)%1,a=i*2.4+t*1.7;
   const x=anchor.x+Math.cos(a)*(24-p*16),y=anchor.y-26-p*52;
   c.globalAlpha=.5+p*.5;pixel(c,x,y,2,2,i%2?'#ffcf70':'#fff4d1');
  }
  c.globalAlpha=1;
 }
 flight(c:CanvasRenderingContext2D,time:number,attack:MusicalAttack,hero:Point,enemy:Point,reduced:boolean){
  const age=time-attack.time;if(age<ACTOR_WINDUP_SECONDS||age>=FLIGHT_SECONDS)return;
  const p=(age-ACTOR_WINDUP_SECONDS)/(FLIGHT_SECONDS-ACTOR_WINDUP_SECONDS),profile=theaterAttack(attack.combo);
  const from={x:hero.x+37,y:hero.y-58},to={x:enemy.x-8,y:enemy.y-48};
  if(attack.hold){
   const length=(to.x-from.x)*p;
   for(let line=0;line<5;line++){
    const y=from.y-8+line*4;c.globalAlpha=.65;pixel(c,from.x,y-1,Math.round(length),3,'#5a3440');pixel(c,from.x,y,Math.round(length),1,'#fff0bd');
   }
   c.globalAlpha=1;
  }
  for(let voice=0;voice<profile.voices;voice++){
   const point=flightPoint(p,voice,profile,from,to),color=voice%2?'#fff4d8':'#ffc866';
   for(let trail=1;trail<=6;trail++){
    const tail=flightPoint(Math.max(0,p-trail*.065),voice,profile,from,to);
    c.globalAlpha=(1-trail/7)*.7;pixel(c,tail.x,tail.y,4,2,color);
   }
   c.globalAlpha=1;note(c,point.x,point.y,color,profile.accent?1.7:1.2);
   if(profile.tier>=2)pixel(c,point.x-3,point.y+8,7,1,'#d66e67');
  }
  if(profile.accent&&profile.tier>=1){
   c.globalAlpha=profile.finale?.7:.4;
   for(let line=0;line<5;line++)for(let sample=0;sample<20;sample++){
    const q=sample/20*p,x=from.x+(to.x-from.x)*q,y=from.y+(to.y-from.y)*q-18+line*6;
    const py=y+(reduced?0:Math.sin(q*12+time*8)*4);pixel(c,x,py+1,4,2,'#54323b');pixel(c,x,py,4,1,'#ffe4a2');
   }
   c.globalAlpha=1;
  }
 }
 impact(c:CanvasRenderingContext2D,age:number,attack:MusicalAttack,anchor:Point,reduced:boolean,titleY=82){
  const profile=theaterAttack(attack.combo),life=profile.finale?1.05:.62;if(profile.tier===0||age<0||age>life)return;
  c.globalAlpha=Math.max(0,1-age/life);
  const count=profile.finale?12:profile.accent?8:profile.tier+2;
  for(let i=0;i<count;i++){
   const angle=i/count*Math.PI*2,reach=reduced?22:10+age*(profile.finale?130:80);
   const x=anchor.x+Math.cos(angle)*reach,y=anchor.y-48+Math.sin(angle)*reach*.7;
   if(i%3===0)note(c,x,y,i%2?'#fff6da':'#ffc96c',.75);
   else pixel(c,x,y,3,3,i%2?'#ffb67c':'#fff2bb');
  }
  if(profile.tier===2){
   for(let voice=0;voice<3;voice++){
    const a=voice/3*Math.PI*2+(reduced?0:age*2),r=32+(reduced?0:age*22);
    note(c,anchor.x+Math.cos(a)*r,anchor.y-48+Math.sin(a)*r,'#ffe2a0',1.5);
   }
  }
  if(profile.tier===3){
   const bloom=reduced?1:Math.min(1,age/.09),heights=[28,44,62,44,28];
   for(let pipe=0;pipe<5;pipe++){
    const x=anchor.x-44+pipe*21,h=Math.round(heights[pipe]*bloom);
    pixel(c,x-1,anchor.y+7-h,8,h+2,'#432c3d');pixel(c,x,anchor.y+8-h,6,h,'#f7b95e');pixel(c,x+1,anchor.y+8-h,2,h,'#fff3cc');pixel(c,x,anchor.y+6-h,6,2,'#fff7e6');
   }
  }
  if(profile.accent){
   for(let line=0;line<5;line++)pixel(c,anchor.x-48,anchor.y-72+line*8,96,1,'#ffe5a5');
  }
  if(profile.finale&&attack.kind!=='boss'){
   c.textAlign='center';c.font='14px NeoPixel,monospace';c.lineWidth=4;c.strokeStyle='#251c29';const title=`${attack.combo} COMBO · GRAND FINALE`;c.strokeText(title,240,titleY);c.fillStyle='#fff0bf';c.fillText(title,240,titleY);
  }
  c.globalAlpha=1;
 }
}
