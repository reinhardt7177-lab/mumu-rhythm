import type { PlayMode, RuntimeNote } from '../types';
import type { GameSnapshot, JudgeEvent } from '../engine/game';
import { DEFAULT_APPROACH_SECONDS } from '../core/judge';
import { noteGeometry, TRACK, trackY } from './noteTrackGeometry';
import {feedbackKind,FEEDBACK,type FeedbackKind}from './feedback';
import {PixelEffects,type EffectId}from './pixelEffects';
import{LaneInput}from'./laneInput';
import{THEATER_FX}from'./theaterAttack';
import{worldTheme,type WorldTheme}from'./worldAttack';
import{drawNoteBar,drawHoldRibbon}from'./noteBar';

const COLORS=['#81e6d0','#ff92ad','#ffe39a','#b8e491','#b7b5ff'];
interface Hit { id:string; lane:number; x:number; y:number; head:{x:number;y:number;width:number;height:number}; note:RuntimeNote }
export class NoteTrack {
  private ctx:CanvasRenderingContext2D;
  private hits:Hit[]=[];
  private bursts:{x:number;y:number;t:number;lane:number;kind:FeedbackKind}[]=[];
  private fx=new PixelEffects();
  private input=new LaneInput();
  private judgeAnimation?:Animation;
  private theater=false;
  private theme:WorldTheme|undefined;
  private themeReady:Promise<unknown>=Promise.resolve();
  get ready(){return Promise.all([this.fx.ready,this.themeReady]);}
  private reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  constructor(private canvas:HTMLCanvasElement,private buttons:HTMLButtonElement[],private label:HTMLElement) {
    this.ctx=canvas.getContext('2d')!;
  }
  setTheme(id:string){this.theater=id==='past';this.theme=worldTheme(id);this.themeReady=this.theme?this.fx.preload([...Object.values(this.theme.fx),this.theme.rune]):this.theater?this.fx.preload([...Object.values(THEATER_FX),'theater-rune']):Promise.resolve();}
  press(lane:number,source:string,time=performance.now()){
    if(!this.input.down(lane,source,time))return false;
    this.syncKeys(time);return true;
  }
  release(source:string){this.input.up(source);this.syncKeys(performance.now());}
  clearInput(){this.input.clear();this.buttons.forEach(b=>{b.classList.remove('pressed');b.classList.remove('down');});}
  private syncKeys(time:number){this.buttons.forEach((button,lane)=>{const s=this.input.sample(lane,time);button.classList.toggle('down',s.held);button.classList.toggle('pressed',s.energy>.05);});}
  reset(){this.hits=[];this.bursts=[];this.judgeAnimation?.cancel();this.label.textContent='';this.clearInput();}
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
    this.judgeAnimation?.cancel();
    this.judgeAnimation=this.label.animate(
      [{opacity:1,transform:this.reduced?'none':'scale(1.12)'},{opacity:1,transform:'none',offset:.18},{opacity:0,transform:'none'}],
      {duration:520,fill:'forwards'});
  }
  draw(s:GameSnapshot,mode:PlayMode) {
    const c=this.ctx;
    c.setTransform(this.canvas.width/TRACK.width,0,0,this.canvas.height/TRACK.height,0,0);
    c.imageSmoothingEnabled=false;c.fillStyle='#171d2c';c.fillRect(0,0,TRACK.width,TRACK.height);this.hits=[];
    for(let i=0;i<5;i++) {
      c.fillStyle=i%2?'#202735':'#171e2b';c.fillRect(i*48+1,0,46,360);
      c.fillStyle='#3e495c';c.fillRect(i*48,0,1,360);
      c.fillStyle='#0e1421';c.fillRect(i*48+2,TRACK.hitlineY+3,44,24);
      c.fillStyle=COLORS[i];c.globalAlpha=.48;c.fillRect(i*48+5,TRACK.hitlineY+20,38,2);c.globalAlpha=1;
      const input=this.input.sample(i,performance.now());
      const pulse=s.paused?0:Math.max(s.lanePulse[i]??0,input.energy);
      this.buttons[i].classList.toggle('pressed',pulse>.05);
      this.buttons[i].classList.toggle('down',!s.paused&&input.held);
      if(pulse>.05){
        c.fillStyle=COLORS[i];c.globalAlpha=pulse*.13;c.fillRect(i*48+1,0,46,360);
        for(let band=0;band<4;band++){c.globalAlpha=pulse*.55*(1-band/4)**2;c.fillRect(i*48+2,TRACK.hitlineY-band*10,44,10);}
        c.globalAlpha=pulse*.9;c.fillRect(i*48+2,TRACK.hitlineY-2,44,5);
        c.globalAlpha=pulse*.55;c.fillRect(i*48+1,TRACK.hitlineY-52,1,54);c.fillRect(i*48+46,TRACK.hitlineY-52,1,54);
        c.globalAlpha=1;
      }
    }
    const spb=60/s.song.bpm,approach=s.song.approachSeconds??DEFAULT_APPROACH_SECONDS;
    if(s.song.measureStarts)for(const beat of s.song.measureStarts){
      if(beat<s.beat-.5)continue;
      if(beat>s.beat+approach/spb)break;
      c.fillStyle='#46506a';c.fillRect(0,Math.round(trackY(beat*spb-s.songTime,approach)),240,1);
    }
    else for(let b=Math.floor(s.beat);b<s.beat+approach/spb;b++) {
      const y=trackY(b*spb-s.songTime,approach);
      c.fillStyle=b%s.song.beatsPerBar===0?'#46506a':'#2a354c';c.fillRect(0,Math.round(y),240,1);
    }
    c.fillStyle=mode==='challenge'?'#ffe39a':'#9daac4';c.fillRect(0,TRACK.hitlineY-1,TRACK.width,2);
    const pairs=new Map<number,number>();
    for(const n of s.notes){
      if(!n.paired)continue;
      const geometry=noteGeometry(n,s.songTime,spb,approach);
      if(!geometry)continue;
      const other=pairs.get(n.beat);
      if(other===undefined)pairs.set(n.beat,geometry.x);
      else{
        c.fillStyle='#fff2b0';c.globalAlpha=.8;
        c.fillRect(Math.min(other,geometry.x),geometry.y-1,Math.abs(other-geometry.x),2);
        c.globalAlpha=1;
      }
    }
    for(const n of s.notes) {
      const geometry=noteGeometry(n,s.songTime,spb,approach);
      if(!geometry)continue;
      const {head,body,x,y}=geometry;
      if(body)drawHoldRibbon(c,body,COLORS[n.lane],n.holding);
      if(n.holding){
        const age=Math.max(0,s.songTime-(n.holdStartedAt??s.songTime));
        this.fx.draw(c,this.theme?.rune??(this.theater?'theater-rune':'hold-loop'),age,x,y,.34,this.reduced);
        if(body){c.fillStyle='#b9ffed';for(let stripe=0;stripe<body.height;stripe+=12){const sy=body.y+(stripe+(this.reduced?0:age*34)%12);if(sy<y-4)c.fillRect(body.x+5,Math.round(sy),16,2);}}
      }
      drawNoteBar(c,head,COLORS[n.lane],{accent:n.musicalRole&&n.accent,bass:n.musicalRole==='bass',holding:n.holding,progress:n.holdProgress});
      this.hits.push({id:n.id,lane:n.lane,x,y,head,note:n});
    }
    this.bursts=this.bursts.filter(b=>s.songTime-b.t<Math.min(.8,FEEDBACK[b.kind].duration));
    for(const b of this.bursts){
      const age=s.songTime-b.t,scale=b.kind==='normal'?.38:b.kind==='combo'?.42:.36;
      const offset=FEEDBACK[b.kind].centerOffset;
      if(age<.16){
        const radius=this.reduced?10:Math.round(8+age*100),x=Math.round(b.x),y=Math.round(b.y);
        c.fillStyle='#fff2b0';c.globalAlpha=1-age/.16;
        c.fillRect(x-radius-3,y-2,5,4);c.fillRect(x+radius-2,y-2,5,4);
        c.fillRect(x-2,y-7,4,3);c.globalAlpha=1;
      }
      this.fx.draw(c,this.theme?.fx[b.kind]??(this.theater?THEATER_FX[b.kind]:FEEDBACK[b.kind].asset as EffectId),age+(b.kind==='combo'?.22:0),b.x,b.y+offset*scale,scale,this.reduced);
    }
  }
}
