import type { PlayMode, RuntimeNote } from '../types';
import type { GameSnapshot, JudgeEvent } from '../engine/game';
import { DEFAULT_APPROACH_SECONDS } from '../core/judge';
import { noteGeometry, TRACK, trackY } from './noteTrackGeometry';
import {feedbackKind,FEEDBACK,type FeedbackKind}from './feedback';
import {PixelEffects,type EffectId}from './pixelEffects';
import{LaneInput}from'./laneInput';
import{THEATER_FX}from'./theaterAttack';
import{worldTheme,type WorldTheme}from'./worldAttack';

const COLORS=['#81e6d0','#ff92ad','#ffe39a','#b8e491','#b7b5ff'];
interface Hit { id:string; lane:number; x:number; y:number; head:{x:number;y:number;width:number;height:number}; note:RuntimeNote }
export class NoteTrack {
  private ctx:CanvasRenderingContext2D;
  private hits:Hit[]=[];
  private bursts:{x:number;y:number;t:number;lane:number;kind:FeedbackKind}[]=[];
  private fx=new PixelEffects();
  private input=new LaneInput();
  private theater=false;
  private theme:WorldTheme|undefined;
  private themeReady:Promise<unknown>=Promise.resolve();
  get ready(){return Promise.all([this.fx.ready,this.themeReady]);}
  private reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  constructor(private canvas:HTMLCanvasElement,private buttons:HTMLButtonElement[],private label:HTMLElement) {
    this.ctx=canvas.getContext('2d')!;
  }
  setTheme(id:string){this.theater=id==='past';this.theme=worldTheme(id);this.themeReady=this.theme?this.fx.preload([...Object.values(this.theme.fx),this.theme.rune]):this.theater?this.fx.preload([...Object.values(THEATER_FX),'theater-rune']):Promise.resolve();}
  press(lane:number,source:string,time=performance.now()){this.input.down(lane,source,time);this.syncKeys(time);}
  release(source:string){this.input.up(source);this.syncKeys(performance.now());}
  clearInput(){this.input.clear();this.buttons.forEach(b=>{b.classList.remove('pressed');b.classList.remove('down');});}
  private syncKeys(time:number){this.buttons.forEach((button,lane)=>{const s=this.input.sample(lane,time);button.classList.toggle('down',s.held);button.classList.toggle('pressed',s.energy>.05);});}
  reset(){this.hits=[];this.bursts=[];this.label.textContent='';this.clearInput();}
  targetAt(clientX:number,clientY:number) {
    const r=this.canvas.getBoundingClientRect();
    if(r.width<=0||r.height<=0)return undefined;
    const x=(clientX-r.left)/r.width*TRACK.width,y=(clientY-r.top)/r.height*TRACK.height;
    if(x<0||x>=TRACK.width||y<0||y>=TRACK.height)return undefined;
    const lane=Math.floor(x/TRACK.laneWidth);
    // Spatial selection only; RhythmGame judges the actual audio input timestamp.
    const hit=this.hits.filter(n=>!n.note.completed&&!n.note.missed&&n.lane===lane
      &&x>=n.head.x-4&&x<=n.head.x+n.head.width+4
      &&y>=n.head.y-10&&y<=n.head.y+n.head.height+10)
      .sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0];
    return hit?{id:hit.id,lane:hit.lane,x:hit.x,y:hit.y}:undefined;
  }
  feedback(e:JudgeEvent,time:number) {
    const hit=this.hits.find(n=>n.id===e.noteId);
    const kind=feedbackKind(e.judge==='PERFECT',e.combo,!!e.hold);
    if(e.judge!=='MISS')this.bursts.push({x:hit?.x??(e.lane+.5)*TRACK.laneWidth,y:hit?.y??TRACK.hitlineY,t:time,lane:e.lane,kind});
    if(this.bursts.length>32)this.bursts.shift();
    this.label.style.color=e.judge==='MISS'?'#aaa6b5':this.theme?(kind==='combo'?this.theme.secondary:this.theme.primary):FEEDBACK[kind].color;
    this.label.textContent=e.judge==='MISS'?'MISS':kind==='combo'?`${e.combo} COMBO`:kind==='hold'?'HOLD!':e.judge;
    this.label.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:this.reduced?'translateY(0)':'translateY(-12px)'}],{duration:650,fill:'forwards'});
  }
  draw(s:GameSnapshot,mode:PlayMode) {
    const c=this.ctx;
    c.setTransform(this.canvas.width/TRACK.width,0,0,this.canvas.height/TRACK.height,0,0);
    c.imageSmoothingEnabled=false;c.fillStyle='#171d2c';c.fillRect(0,0,TRACK.width,TRACK.height);this.hits=[];
    for(let i=0;i<5;i++) {
      c.fillStyle=i%2?'#20283c':'#192234';c.fillRect(i*48+1,0,46,360);
      c.fillStyle='#46516a';c.fillRect(i*48,0,1,360);
      const input=this.input.sample(i,performance.now());
      const pulse=s.paused?0:Math.max(s.lanePulse[i]??0,input.energy);
      this.buttons[i].classList.toggle('pressed',pulse>.05);
      this.buttons[i].classList.toggle('down',!s.paused&&input.held);
      if(pulse>.05){
        c.fillStyle=COLORS[i];c.globalAlpha=pulse*.13;c.fillRect(i*48+1,0,46,360);
        for(let band=0;band<12;band++){c.globalAlpha=pulse*.55*(1-band/12)**2;c.fillRect(i*48+1,TRACK.hitlineY-band*8,46,8);}
        c.globalAlpha=pulse*.9;c.fillRect(i*48+2,TRACK.hitlineY-2,44,5);
        c.globalAlpha=pulse*.55;c.fillRect(i*48+1,TRACK.hitlineY-52,1,54);c.fillRect(i*48+46,TRACK.hitlineY-52,1,54);
        c.globalAlpha=1;
      }
    }
    const spb=60/s.song.bpm,approach=s.song.approachSeconds??DEFAULT_APPROACH_SECONDS;
    for(let b=Math.floor(s.beat);b<s.beat+approach/spb;b++) {
      const y=trackY(b*spb-s.songTime,approach);
      c.fillStyle=b%s.song.beatsPerBar===0?'#46506a':'#2a354c';c.fillRect(0,Math.round(y),240,1);
    }
    c.fillStyle=mode==='challenge'?'#ffe39a':'#9daac4';c.fillRect(0,TRACK.hitlineY-1,TRACK.width,2);
    for(const n of s.notes) {
      const geometry=noteGeometry(n,s.songTime,spb,approach);
      if(!geometry)continue;
      const {head,body,x,y}=geometry;
      if(body){c.fillStyle=COLORS[n.lane]+'66';c.fillRect(body.x,body.y,body.width,body.height);c.fillStyle=COLORS[n.lane];c.fillRect(body.x,body.y,1,body.height);}
      if(n.holding){
        const age=Math.max(0,s.songTime-(n.holdStartedAt??s.songTime));
        this.fx.draw(c,this.theme?.rune??(this.theater?'theater-rune':'hold-loop'),age,x,y,.34,this.reduced);
        if(body){c.fillStyle='#b9ffed';for(let stripe=0;stripe<body.height;stripe+=12){const sy=body.y+(stripe+(this.reduced?0:age*34)%12);if(sy<y-4)c.fillRect(body.x+5,Math.round(sy),16,2);}}
      }
      c.fillStyle='#080f20';c.fillRect(head.x-1,head.y-2,head.width+2,head.height+4);
      c.fillStyle=COLORS[n.lane];c.fillRect(head.x,head.y,head.width,head.height);
      c.fillStyle='#fff9df';c.fillRect(head.x+2,head.y,head.width-4,2);
      c.fillStyle='#00000033';c.fillRect(head.x+2,head.y+head.height-2,head.width-4,2);
      if(n.holding){c.fillStyle='#ffffff';c.fillRect(head.x+2,head.y+4,Math.round((head.width-4)*(n.holdProgress??0)),2);}
      this.hits.push({id:n.id,lane:n.lane,x,y,head,note:n});
    }
    this.bursts=this.bursts.filter(b=>s.songTime-b.t<Math.min(.8,FEEDBACK[b.kind].duration));
    for(const b of this.bursts){
      const age=s.songTime-b.t,scale=b.kind==='normal'?.38:b.kind==='combo'?.42:.36;
      const offset=FEEDBACK[b.kind].centerOffset;
      this.fx.draw(c,this.theme?.fx[b.kind]??(this.theater?THEATER_FX[b.kind]:FEEDBACK[b.kind].asset as EffectId),age+(b.kind==='combo'?.22:0),b.x,b.y+offset*scale,scale,this.reduced);
    }
  }
}
