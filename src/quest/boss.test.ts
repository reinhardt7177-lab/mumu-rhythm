import{describe,it,expect}from'vitest';
import{BOSS_THEMES,bossBudget,bossState}from'./boss';
import{Combat,FLIGHT_SECONDS}from'./combat';
import{MUSIC_LIBRARY}from'./catalog';
import{HOLD_NOTE_MIN_BEATS,type PlayMode,type Song}from'../types';

function simulate(song:Song,perfect:boolean,mode:PlayMode='challenge'){
 const notes=song.melody.map(n=>({...n,completed:false,missed:false}));
 const completion=(n:typeof notes[number])=>n.beat+(n.durationBeats>=HOLD_NOTE_MIN_BEATS?n.durationBeats:0);
 const ordered=[...notes].sort((a,b)=>completion(a)-completion(b));
 const duration=song.totalBeats*60/song.bpm;
 let combo=0,index=0,entry=0,budget=0,kill=Infinity,budgetCalls=0;
 const combat=new Combat((power,progress)=>{
  budgetCalls++;
  entry=progress;
  budget=bossBudget(song,mode,power,progress,notes);return budget;
 });
 for(let frame=0;frame/120<=duration+.25;frame++){
  const time=frame/120;
  while(index<ordered.length&&completion(ordered[index])*60/song.bpm<=time){
   const note=ordered[index++];note.completed=true;
   combat.launch(perfect,++combo,completion(note)*60/song.bpm,note.durationBeats>=HOLD_NOTE_MIN_BEATS);
  }
  for(const attack of combat.advance(time,Math.min(1,time/duration)))if(attack.target===3&&attack.defeated)kill=attack.at/duration;
 }
 return{combat,entry,budget,kill,budgetCalls};
}

describe('world chord sovereigns',()=>{
 it('has four distinct bosses and three ordered movement names each',()=>{
  expect(Object.keys(BOSS_THEMES)).toEqual(['past','present','future','fantasy']);
  expect(new Set(Object.values(BOSS_THEMES).map(b=>b.name)).size).toBe(4);
  for(const b of Object.values(BOSS_THEMES))expect(b.movements).toHaveLength(3);
 });
 it('scales final-segment budget by playable note completions without doubling hold damage',()=>{
  const song={totalBeats:100,melody:Array.from({length:30},(_,i)=>({beat:72+i*.8,durationBeats:.5}))}as Song;
  expect(bossBudget(song,'challenge')).toBeGreaterThan(220);expect(bossBudget(song,'explore')).toBeLessThan(bossBudget(song,'challenge'));
  const dense={...song,melody:[...song.melody,...song.melody,...song.melody]};expect(bossBudget(dense,'challenge')).toBeGreaterThan(bossBudget(song,'challenge'));
  expect(bossBudget({...song,melody:[]},'challenge')).toBeGreaterThan(0);
 });
 it('selects three HP phases and always telegraphs before a cast',()=>{
  expect(bossState(0,1,10,10).phase).toBe(0);expect(bossState(0,.6,10,10).phase).toBe(1);expect(bossState(0,.2,10,10).phase).toBe(2);
  for(const hp of[1,.6,.2]){let warning=false,cast=false;for(let beat=0;beat<8;beat+=.05){const s=bossState(beat,hp,10,10);if(s.action==='charge')warning=true;if(s.action==='cast'){expect(warning).toBe(true);cast=true}}expect(cast).toBe(true)}
 });
 it('lets chord break interrupt attacks and defeat override every pose',()=>{
  expect(bossState(5.5,.8,.1,0)).toMatchObject({action:'broken',frame:6});
  expect(bossState(5.5,0,.1,0)).toMatchObject({action:'defeated',frame:7});
  expect(bossState(1,.8,10,.05)).toMatchObject({action:'hurt',frame:5});
 });
 it('uses configured boss HP once and retains single impact damage',()=>{
  const c=new Combat(600);c.stage=2;c.hp=0;c.update(.72);expect(c.hp).toBe(600);expect(c.maxHp).toBe(600);
  const attack=c.launch(true,8,1)!;c.advance(attack.at,.75);expect(c.hp).toBe(552);c.advance(attack.at+.1,.75);expect(c.hp).toBe(552);
 });
 it('sets adaptive HP only on boss entry using actual performance and remaining notes',()=>{
  let calls=0;const c=new Combat((power,progress)=>{calls++;expect(progress).toBe(.8);return power*30});
  for(let i=0;i<10;i++)c.launch(true,1,i);c.stage=2;c.hp=0;c.update(.8);expect(c.hp).toBe(540);expect(calls).toBe(1);c.update(.95);expect(calls).toBe(1);
 });
 it('keeps a sparse successful tail winnable without a fixed HP floor',()=>{
  const song={totalBeats:100,melody:[94,96,98,99].map(beat=>({beat,durationBeats:.5}))}as Song;
  for(const perfect of[false,true]){
   const c=new Combat((power,progress)=>bossBudget(song,'challenge',power,progress));
   c.stage=2;c.hp=0;c.update(.72);
   for(let combo=1;combo<=4;combo++)c.hit(perfect,combo);
   expect(c.won).toBe(true);
  }
 });
 it('keeps short tails winnable across learned grades and every combo offset',()=>{
  for(const perfect of[false,true])for(let offset=0;offset<8;offset++)for(let count=1;count<=16;count++){
   const song={totalBeats:100,melody:Array.from({length:count},(_,i)=>({beat:95+i*4/count,durationBeats:.1}))}as Song;
   const c=new Combat((power,progress)=>bossBudget(song,'challenge',power,progress));
   let combo=0;
   while(combo<64+offset)c.hit(perfect,++combo);
   c.stage=2;c.hp=0;c.update(.72);
   for(let i=0;i<count;i++)c.hit(perfect,++combo);
   expect(c.won,`perfect=${perfect} offset=${offset} count=${count}`).toBe(true);
  }
 });
 it('does not truncate dense late-note damage at 2400 HP',()=>{
  const song={bpm:120,totalBeats:400,melody:Array.from({length:2400},(_,i)=>({beat:i/6,durationBeats:.1}))}as Song;
  expect(bossBudget(song,'challenge',21.75)).toBeGreaterThan(10000);
  for(const perfect of[false,true]){
   const result=simulate(song,perfect);
   expect(result.combat.won).toBe(true);
   expect(result.kill).toBeGreaterThanOrEqual(.94);expect(result.kill).toBeLessThan(.98);
  }
 });
 it('counts only uncompleted playable completions, including a crossing hold once',()=>{
  const song={totalBeats:100,melody:[]}as unknown as Song;
  const active=[{beat:70,durationBeats:4},{beat:96,durationBeats:.5}];
  const excluded=[
   {beat:70,durationBeats:1},
   {beat:96,durationBeats:.5,completed:true},
   {beat:97,durationBeats:.5,missed:true},
   {beat:99,durationBeats:4},
  ];
  const notes=[...active,...excluded]as Song['melody'];
  expect(bossBudget(song,'challenge',16.5,.72,notes)).toBe(bossBudget(song,'challenge',16.5,.72,active as Song['melody']));
  expect(bossBudget(song,'challenge',16.5,.72,active.slice(0,1)as Song['melody'])).toBe(12);
  expect(bossBudget(song,'challenge',16.5,.8,notes)).toBe(12);
  expect(bossBudget(song,'challenge',16.5,.8,excluded as Song['melody'])).toBe(1);
 });
 it('uses the last few completions when an arbitrary chart has no 95-percent input',()=>{
  const song={totalBeats:100,melody:Array.from({length:40},(_,i)=>({beat:72+i*.2,durationBeats:.1}))}as Song;
  const hp=bossBudget(song,'challenge',16.5);
  const c=new Combat(hp);c.stage=2;c.hp=0;c.update(.72);
  let killCombo=0;
  for(let combo=1;combo<=40;combo++){c.hit(false,combo);if(c.won){killCombo=combo;break;}}
  expect(killCombo).toBeGreaterThanOrEqual(37);expect(killCombo).toBeLessThanOrEqual(40);
 });
 it('applies an actual hold projectile only once, after its flight',()=>{
  const c=new Combat(100);c.stage=2;c.hp=0;c.update(.72);
  const attack=c.launch(true,8,10,true)!;
  expect(attack.hold).toBe(true);expect(c.hp).toBe(100);
  expect(c.advance(10+FLIGHT_SECONDS-.001,.8)).toEqual([]);expect(c.hp).toBe(100);
  expect(c.advance(attack.at,.8)).toEqual([attack]);expect(c.hp).toBe(52);
  expect(c.advance(attack.at+1,.81)).toEqual([]);expect(c.hp).toBe(52);
 });
 it.each<PlayMode>(['challenge','explore'])('wins near the playable finale of all 14 library charts in %s',mode=>{
  const rows=MUSIC_LIBRARY.map(({song})=>({song,good:simulate(song,false,mode),perfect:simulate(song,true,mode)}));
  expect(rows).toHaveLength(14);
  for(const{song,good,perfect}of rows)for(const result of[good,perfect]){
   const label=`${song.id} ${mode} HP=${result.budget}`;
   expect(result.entry,label).toBeGreaterThanOrEqual(.72);
   expect(result.budgetCalls,label).toBe(1);
   expect(result.combat.won,label).toBe(true);
   expect(result.kill,label).toBeGreaterThanOrEqual(.935);
   expect(result.kill,label).toBeLessThanOrEqual(1);
  }
 });
});
