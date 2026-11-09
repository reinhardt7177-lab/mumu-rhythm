export interface Point {x:number;y:number}
const FLOORS:Record<string,{heroX:number;enemyX:number;groundY:number;lift:number[]}>= {
  past:{heroX:116,enemyX:360,groundY:274,lift:[0,12,0,0]},
  present:{heroX:100,enemyX:370,groundY:224,lift:[0,12,0,0]},
  future:{heroX:112,enemyX:364,groundY:212,lift:[8,14,0,0]},
  fantasy:{heroX:112,enemyX:356,groundY:226,lift:[0,14,0,0]},
};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function sceneActors(worldId:string,stage:number){
  const floor=FLOORS[worldId];
  if(!floor||!Number.isInteger(stage)||stage<0||stage>3)throw new Error('Unknown stage placement');
  return {hero:{x:floor.heroX,y:floor.groundY},enemy:{x:floor.enemyX,y:floor.groundY-floor.lift[stage]},groundY:floor.groundY};
}

export function spriteRect(anchor:Point,size:number){
  return {x:anchor.x-size/2,y:anchor.y-size*120/128,width:size,height:size};
}

export function previewScene(worldId:string,width:number,height:number,heroSize:number,enemySize:number){
  const actors=sceneActors(worldId,0);
  const scale=Math.max(width/480,height/320);
  const background={x:(width-480*scale)/2,y:clamp(height*.76-actors.groundY*scale,height-320*scale,0),width:480*scale,height:320*scale};
  const project=(point:Point,size:number)=>({x:clamp(point.x*scale+background.x,size/2+8,width-size/2-8),y:point.y*scale+background.y});
  return {background,hero:project(actors.hero,heroSize),enemy:project(actors.enemy,enemySize)};
}
