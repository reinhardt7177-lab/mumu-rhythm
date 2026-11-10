import{HOLD_NOTE_MIN_BEATS,type Song,type PlayMode}from'../types';
export const BOSS_THEMES={
 past:{name:'황금 악장의 지휘자',sprite:'/assets/art/boss-v8/past/boss.png',primary:'#ffe09b',secondary:'#ef8b92',movements:['서곡의 봉인','격정의 합주','최후의 대합창'],patterns:['악보의 물결','오르간 화음','황금 대합주']},
 present:{name:'옥상의 베이스 킹',sprite:'/assets/art/boss-v8/present/boss.png',primary:'#72f3dc',secondary:'#ff8aa8',movements:['사운드 체크','베이스 드롭','루프톱 앙코르'],patterns:['스테레오 펄스','베이스 링','도시의 대합주']},
 future:{name:'성운의 신스 군주',sprite:'/assets/art/boss-v8/future/boss.png',primary:'#a2ecff',secondary:'#ef9fff',movements:['궤도 동기화','성운 공명','초신성 피날레'],patterns:['위성의 공명','성운 레일','별자리 대합주']},
 fantasy:{name:'달빛 하프 여왕',sprite:'/assets/art/boss-v8/fantasy/boss.png',primary:'#ffe7aa',secondary:'#d6a8ff',movements:['달빛의 서주','별꽃의 공명','숲의 마지막 화음'],patterns:['달빛의 현','별꽃 아르페지오','별무리 대합주']},
}as const;
export type BossWorld=keyof typeof BOSS_THEMES;
type BudgetNote=Song['melody'][number]&{completed?:boolean;missed?:boolean};
export function bossBudget(song:Song,mode:PlayMode,power=16.5,progress=.72,notes:readonly BudgetNote[]=song.melody){
 const completions=notes.filter(n=>!n.completed&&!n.missed)
  .map(n=>n.beat+(n.durationBeats>=HOLD_NOTE_MIN_BEATS?n.durationBeats:0))
  .filter(beat=>beat>=song.totalBeats*Math.max(.72,progress)&&beat<=song.totalBeats)
  .sort((a,b)=>a-b);
 const count=completions.length;
 const expected=Number.isFinite(power)?Math.max(0,Math.min(48,power)):16.5;
 // No damage gating: front-loaded charts can only finish near their last inputs.
 const target=completions.findIndex(beat=>beat>=song.totalBeats*.95);
 const budgeted=Math.max(1,Math.min(target<0?count:target+1,count-(mode==='explore'?2:1)));
 // Scale worst-offset GOOD damage by the learned mean; partial groups assume no skill.
 const available=Math.floor((count*12+Math.floor(count/8)*36)*expected/16.5);
 return Math.max(1,Math.min(available,Math.ceil(budgeted*expected)));
}
export function bossState(beat:number,hpRatio:number,breakAge=Infinity,hitAge=Infinity){
 const phase=hpRatio>.65?0:hpRatio>.3?1:2,cycle=[8,6,4][phase],at=((Math.max(0,beat)%cycle)+cycle)%cycle;
 const action=hpRatio<=0?'defeated':breakAge>=0&&breakAge<.6?'broken':hitAge>=0&&hitAge<.14?'hurt':at>=cycle*.4&&at<cycle*.7?'charge':at>=cycle*.7&&at<cycle*.85?'cast':'idle';
 const frame=action==='defeated'?7:action==='broken'?6:action==='hurt'?5:action==='charge'?2:action==='cast'?3:phase===2?4:Math.floor(at*2)%2;
 return{phase,action,frame,cycle,at,charge:action==='charge'?(at-cycle*.4)/(cycle*.3):0}as const;
}
