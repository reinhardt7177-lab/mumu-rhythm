import{afterEach,describe,it,expect,vi}from'vitest';
import{QuizAudio}from'./quizAudio';
import type{InstrumentAsset,ListeningClip}from'./bank/types';
const asset={id:'piano',url:'/piano.wav',rootMidi:60,gain:1}as InstrumentAsset;
const clip:ListeningClip={id:'example',instrument:'piano',bpm:120,events:[{beat:0,duration:1,midi:60,velocity:.4},{beat:1,duration:1,midi:72,velocity:.7}]};
function rig(fetcher=vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}as Response))){
 const sources:any[]=[],gains:any[]=[];
 const context={state:'running',currentTime:10,destination:{},resume:vi.fn(async()=>{}),decodeAudioData:vi.fn(async()=>({duration:3})),createGain:()=>{const node={gain:{value:1,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),setTargetAtTime:vi.fn()},connect:vi.fn()};gains.push(node);return node},createBufferSource:()=>{const source={buffer:null,playbackRate:{value:1},connect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};sources.push(source);return source}};
 const player=new QuizAudio([asset],()=>context as unknown as AudioContext,fetcher);
 return{player,sources,gains,fetcher,context};
}
afterEach(()=>vi.useRealTimers());
describe('sample listening player',()=>{
 it('does not call a browser fetch function with the player as its receiver',async()=>{
  vi.useFakeTimers();const fetcher=vi.fn(async function(this:unknown){if(this!==undefined)throw new TypeError('Illegal invocation');return{ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}as Response;});
  const r=rig(fetcher),states:string[]=[];await r.player.play(clip,s=>states.push(s));expect(states).toContain('playing');r.player.stop();
 });
 it('uses note timestamps, sample pitch and distinct dynamics rather than oscillators',async()=>{
  vi.useFakeTimers();const r=rig(),states:string[]=[];await r.player.play(clip,s=>states.push(s));
  expect(states).toEqual(['loading','playing']);expect(r.sources).toHaveLength(2);
  expect(r.sources[0].start.mock.calls[0][0]).toBeCloseTo(10.04);expect(r.sources[1].start.mock.calls[0][0]).toBeCloseTo(10.54);
  expect(r.sources[1].playbackRate.value).toBe(2);expect(r.gains[1].gain.linearRampToValueAtTime.mock.calls[0][0]).toBeLessThan(r.gains[2].gain.linearRampToValueAtTime.mock.calls[0][0]);r.player.stop();
 });
 it('stops old playback and reuses a decoded sample on replay',async()=>{
  vi.useFakeTimers();const r=rig();await r.player.play(clip,()=>{});const old=r.sources[0];await r.player.play(clip,()=>{});
  expect(old.stop).toHaveBeenCalled();expect(r.fetcher).toHaveBeenCalledTimes(1);r.player.stop();
 });
 it('does not start delayed audio after navigation cancelled a pending load',async()=>{
  vi.useFakeTimers();let resolve!:(r:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(r=>resolve=r)),r=rig(fetcher as any),states:string[]=[];
  const pending=r.player.play(clip,s=>states.push(s));await Promise.resolve();r.player.stop();resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}as Response);await pending;
  expect(r.sources).toHaveLength(0);expect(states.at(-1)).toBe('idle');
 });
 it('reports a failed file as a retryable audio error without playing',async()=>{
  vi.useFakeTimers();const r=rig(vi.fn(async()=>({ok:false}as Response))),states:string[]=[];await r.player.play(clip,s=>states.push(s));
  expect(states.at(-1)).toBe('error');expect(r.sources).toHaveLength(0);r.player.stop();
 });
 it('rejects invalid stimulus timing before any source is scheduled',async()=>{
  vi.useFakeTimers();const r=rig(),states:string[]=[];await r.player.play({...clip,bpm:0},s=>states.push(s));expect(states.at(-1)).toBe('error');expect(r.sources).toHaveLength(0);r.player.stop();
 });
});
