interface Rect {x:number;y:number;width:number;height:number}
interface BarState {accent?:boolean;bass?:boolean;holding?:boolean;progress?:number}

export function drawNoteBar(c:CanvasRenderingContext2D,r:Rect,color:string,state:BarState){
 const{x,y,width:w,height:h}=r;
 c.globalAlpha=1;
 c.fillStyle='#070d18';
 c.fillRect(x+1,y-2,w-2,h+4);c.fillRect(x-2,y+1,w+4,h-2);
 c.fillStyle=color;c.fillRect(x,y,w,h);
 // Two stepped corners and a single luminous rail retain a crisp pixel silhouette.
 c.fillStyle='#142033';
 c.fillRect(x,y,1,1);c.fillRect(x+w-1,y,1,1);
 c.fillRect(x,y+h-1,1,1);c.fillRect(x+w-1,y+h-1,1,1);
 c.fillStyle='#effbff';c.globalAlpha=.24;c.fillRect(x+2,y+1,w-4,Math.max(1,h-4));
 c.globalAlpha=1;c.fillRect(x+3,y+1,w-6,1);
 c.fillStyle='#111c30';c.globalAlpha=.38;c.fillRect(x+2,y+h-2,w-4,1);c.globalAlpha=1;
 c.fillStyle=state.accent?'#fff2b0':'#effbff';
 if(state.accent){c.fillRect(x+2,y+3,3,4);c.fillRect(x+w-5,y+3,3,4);}
 else{c.globalAlpha=.7;c.fillRect(x+2,y+3,1,3);c.fillRect(x+w-3,y+3,1,3);c.globalAlpha=1;}
 if(state.bass){c.fillStyle='#18263a';c.fillRect(x+Math.floor(w/2)-1,y+4,2,2);}
 if(state.holding){
  const progress=Number.isFinite(state.progress)?Math.max(0,Math.min(1,state.progress!)):0;
  c.fillStyle='#ffffff';c.fillRect(x+3,y+h-4,Math.round((w-6)*progress),1);
 }
}

export function drawHoldRibbon(c:CanvasRenderingContext2D,r:Rect,color:string,holding:boolean){
 const{x,y,width:w,height:h}=r;if(h<=0)return;
 c.globalAlpha=1;c.fillStyle=color+'66';c.fillRect(x,y,w,h);
 c.fillStyle='#101a2b';c.globalAlpha=.55;c.fillRect(x+2,y,w-4,h);
 c.fillStyle=color;c.globalAlpha=holding?.9:.6;c.fillRect(x+3,y,1,h);c.fillRect(x+w-4,y,1,h);
 c.globalAlpha=holding?.24:.1;c.fillStyle='#effbff';c.fillRect(x+w/2-1,y,2,h);
 c.globalAlpha=1;c.fillStyle=color;c.fillRect(x+3,y,w-6,Math.min(2,h));
}
