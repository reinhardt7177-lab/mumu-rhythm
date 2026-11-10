import type{InstrumentAsset,ListeningClip}from'./bank/types';
export type AudioState='loading'|'playing'|'idle'|'error';
export class QuizAudio{
 private context:AudioContext|undefined;
 private master:GainNode|undefined;
 private buffers=new Map<string,AudioBuffer>();
 private sources=new Set<AudioBufferSourceNode>();
 private controller:AbortController|undefined;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private epoch=0;
 private volume=.7;
 private notify:((state:AudioState)=>void)|undefined;
 constructor(private assets:readonly InstrumentAsset[],private factory=()=>new AudioContext(),private fetcher:typeof fetch=fetch){}
 get volumeLevel(){return this.volume;}
 setVolume(value:number){this.volume=Number.isFinite(value)?Math.max(0,Math.min(1,value)):.7;if(this.master&&this.context)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.02);}
 stop(){
  this.epoch++;this.controller?.abort();this.controller=undefined;clearTimeout(this.timer);this.timer=undefined;
  for(const source of this.sources){try{source.stop();}catch{/* A natural ending may already have stopped this voice. */}}
  this.sources.clear();const notify=this.notify;this.notify=undefined;notify?.('idle');
 }
 async play(clip:ListeningClip,notify:(state:AudioState)=>void){
  this.stop();const epoch=this.epoch;this.notify=notify;notify('loading');
  const controller=new AbortController();this.controller=controller;
  const timeout=setTimeout(()=>controller.abort(),8000);
  let rejectAbort!:(reason:DOMException)=>void;
  const aborted=new Promise<never>((_,reject)=>{rejectAbort=reject;});
  const onAbort=()=>rejectAbort(new DOMException('Stopped','AbortError'));
  controller.signal.addEventListener('abort',onAbort,{once:true});
  void aborted.catch(()=>{});
  try{
   if(!validClip(clip))throw Error('Invalid listening example');
   const asset=this.assets.find(a=>a.id===clip.instrument);if(!asset)throw Error('Missing instrument');
   const context=this.context??=this.factory();
   if(!this.master){this.master=context.createGain();this.master.gain.value=this.volume;this.master.connect(context.destination);}
   if(context.state!=='running')await Promise.race([context.resume(),aborted]);
   if(epoch!==this.epoch)return;if(context.state!=='running')throw Error('Audio permission');
   let buffer=this.buffers.get(asset.url);
   if(!buffer){
    const fetcher=this.fetcher;
    const response=await Promise.race([fetcher(asset.url,{signal:controller.signal}),aborted]);if(!response.ok)throw Error('Audio file unavailable');
    const bytes=await Promise.race([response.arrayBuffer(),aborted]);
    buffer=await Promise.race([context.decodeAudioData(bytes),aborted]);
    if(epoch!==this.epoch)return;this.buffers.set(asset.url,buffer);
   }
   if(epoch!==this.epoch)return;
   const start=context.currentTime+.04,seconds=60/clip.bpm;let finish=start;
   for(const event of clip.events){
    const pitches=Array.isArray(event.midi)?event.midi:[event.midi];
    for(const midi of pitches){
     const source=context.createBufferSource(),envelope=context.createGain(),at=start+event.beat*seconds;
     const rate=2**((midi-asset.rootMidi)/12),length=Math.min(event.duration*seconds,buffer.duration/rate);
     source.buffer=buffer;source.playbackRate.value=rate;
     const level=(event.velocity??.6)*asset.gain/pitches.length;
     envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(level,at+.006);
     envelope.gain.setValueAtTime(level,at+Math.max(.006,length-.04));envelope.gain.linearRampToValueAtTime(0,at+length);
     source.connect(envelope);envelope.connect(this.master);source.onended=()=>{this.sources.delete(source);source.disconnect();envelope.disconnect();};
     this.sources.add(source);source.start(at);source.stop(at+length+.01);finish=Math.max(finish,at+length+.01);
    }
   }
   notify('playing');this.timer=setTimeout(()=>{if(epoch===this.epoch)this.stop();},Math.max(0,finish-context.currentTime)*1000+40);
  }catch{
   if(epoch===this.epoch){for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();notify('error');}
  }finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',onAbort);}
 }
}
export function validClip(clip:ListeningClip){
 return Number.isFinite(clip.bpm)&&clip.bpm>=40&&clip.bpm<=200&&clip.events.length>0&&clip.events.length<=40&&clip.events.every(e=>
  Number.isFinite(e.beat)&&e.beat>=0&&Number.isFinite(e.duration)&&e.duration>0&&(e.beat+e.duration)*60/clip.bpm<=16&&
  (Array.isArray(e.midi)?e.midi:[e.midi]).length>0&&(Array.isArray(e.midi)?e.midi:[e.midi]).length<=4&&
  (Array.isArray(e.midi)?e.midi:[e.midi]).every(m=>Number.isFinite(m)&&m>=36&&m<=96)&&
  (e.velocity===undefined||(Number.isFinite(e.velocity)&&e.velocity>0&&e.velocity<=1)));
}
