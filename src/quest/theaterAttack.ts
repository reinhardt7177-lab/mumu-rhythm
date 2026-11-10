export const THEATER_FX={normal:'hit',perfect:'theater-perfect',hold:'theater-hold',combo:'theater-combo',boss:'boss'}as const;
export function theaterAttack(combo:number){
 const count=Math.max(0,Math.floor(combo)),tier=count>=48?3:count>=24?2:count>=8?1:0;
 const finale=count>0&&count%64===0;
 const cadence=count>0&&count%32===0;
 return{tier,voices:finale?7:[1,2,3,5][tier],accent:count>0&&count%8===0,finale,cadence,phrase:Math.floor(count/8)%3,variant:count%2,
  name:finale?'황금빛 피날레':cadence?'황금 카덴차':['지휘봉 스타카토','두 성부의 대화','세 음의 화음','오케스트라 합주'][tier]};
}
export type TheaterAttack=ReturnType<typeof theaterAttack>;
export function theaterPose(age:number,attack:TheaterAttack,holding:boolean,releasedHold=false){
 if(attack.finale&&age>=.08&&age<.28)return 7;
 if(holding)return 6;
 if(age<0||age>=.44)return 0;
 if(age<.08)return attack.accent||releasedHold?4:1;
 if(age<.28)return releasedHold||attack.accent?5:attack.variant?2:3;
 return attack.variant?3:2;
}
export function flightPoint(p:number,voice:number,attack:TheaterAttack,from:{x:number;y:number},to:{x:number;y:number}){
 if(p<=0)return{...from};if(p>=1)return{...to};
 const rank=voice-(attack.voices-1)/2;
 const arc=Math.sin(p*Math.PI),fan=attack.voices===1?(attack.variant?14:-14):rank*18;
 const stagger=Math.max(0,Math.min(1,p+rank*.055*arc));
 const phrase=attack.phrase===1?Math.sin(p*Math.PI*2)*(12+Math.abs(rank)*5):attack.phrase===2?-arc*(16+Math.abs(rank)*8):0;
 return{x:from.x+(to.x-from.x)*stagger,y:from.y+(to.y-from.y)*p+arc*(fan-12)+Math.sin(p*Math.PI*2)*rank*4+phrase};
}
