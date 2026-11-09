export type FeedbackKind='normal'|'perfect'|'hold'|'combo'|'boss';
export const FEEDBACK={
 normal:{asset:'hit',duration:.5,recovery:.13,kick:3,shake:0,color:'#ffe09b',centerOffset:20},
 perfect:{asset:'perfect',duration:.9,recovery:.2,kick:7,shake:0,color:'#d1fffc',centerOffset:26},
 hold:{asset:'hold-end',duration:.95,recovery:.22,kick:6,shake:0,color:'#80f8e5',centerOffset:0},
 combo:{asset:'combo',duration:1.6,recovery:.28,kick:10,shake:2,color:'#ffb7ee',centerOffset:28},
 boss:{asset:'boss',duration:2.2,recovery:.32,kick:12,shake:3,color:'#ffeab1',centerOffset:17},
} as const;
export function feedbackKind(perfect:boolean,combo:number,hold:boolean,boss=false):FeedbackKind{
 return boss?'boss':combo>0&&combo%8===0?'combo':hold?'hold':perfect?'perfect':'normal';
}
export function frameIndex(age:number,fps:number,count:number,loop:boolean):number|null{
 if(!Number.isFinite(age)||age<0||count<=0)return null;
 const index=Math.floor(age*fps+1e-8);return loop?index%count:index<count?index:null;
}
export function finaleRemaining(at:number|undefined,time:number){return at===undefined?0:Math.max(0,FEEDBACK.boss.duration-(time-at));}
