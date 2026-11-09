export const ACTOR_WINDUP_SECONDS=.08;
export function heroFrame(castAge:number,time:number,reduced:boolean):number {
  if(castAge>=0&&castAge<.36)return castAge<ACTOR_WINDUP_SECONDS?2:3;
  return reduced?0:Math.max(0,Math.floor(time*3))%2;
}
export function enemyFrame(stage:number,hurt:boolean):number {
  if(!Number.isInteger(stage)||stage<0||stage>3)throw new Error('Invalid enemy stage');
  return 4+stage*2+(hurt?1:0);
}
