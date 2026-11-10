import{createElement,ZoomIn,ZoomOut}from'lucide';
import type{ScoreNote,Visual}from'./bank/types';
const beats={w:4,h:2,q:1,'8':.5,'16':.25};
function staffPosition(key:string){
 const match=/^([a-g])\/(\d)$/.exec(key);if(!match)return'음표 위치';
 const step=Number(match[2])*7+'cdefgab'.indexOf(match[1])-30;
 if(step<0)return step%2===0?`오선 아래 ${-step/2}번째 덧줄`:`오선 아래 ${(-step+1)/2}번째 칸`;
 if(step>8)return step%2===0?`오선 위 ${(step-8)/2}번째 덧줄`:`오선 위 ${(step-7)/2}번째 칸`;
 return step%2===0?`아래에서 ${step/2+1}번째 줄`:`아래에서 ${(step+1)/2}번째 칸`;
}
export function scoreBeats(notes:readonly ScoreNote[]){return notes.reduce((sum,n)=>sum+beats[n.duration]*(2-2**-(n.dots??0)),0);}
export function engravingKeys(note:ScoreNote){return note.rest?['r/4']:note.keys??['c/5'];}
export function notationLabel(visual:Visual){
 if(visual.kind==='labels')return`그림의 순서: ${visual.cells.join(', ')}`;
 return'악보 그림. '+visual.notes.map(n=>(n.rest?({w:'오선 아래에 매달린 네모 쉼표',h:'오선 위에 놓인 네모 쉼표',q:'꺾인 세로 모양 쉼표','8':'둥근 점과 기둥의 쉼표','16':'점 두 개와 기둥의 쉼표'}[n.duration]):`${n.keys&&n.keys.length>1?`동시에 놓인 머리${n.keys.length}개, `:''}${(n.keys??['c/5']).map(staffPosition).join(', ')}, ${n.duration==='w'?'빈 머리, 기둥 없음':n.duration==='h'?'빈 머리, 기둥 있음':`검은 머리, 기둥 있음${n.duration==='8'?', 꼬리1개':n.duration==='16'?', 꼬리2개':''}`}`)+(n.dots?`, 오른쪽 점${n.dots}개`:'')).join('; ');
}
let engine:Promise<typeof import('vexflow/bravura')>|undefined;
function loadEngraver(){return engine??=import('vexflow/bravura').then(async module=>{await document.fonts.load('32px Bravura');await document.fonts.load('12px Academico');return module;}).catch(error=>{engine=undefined;throw error;});}
export function visualElement(visual:Visual,zoomable=true){
 const figure=document.createElement('figure');figure.className='music-visual';
 if(visual.kind==='labels'){
  const cells=document.createElement('div');cells.className='music-cells';cells.setAttribute('role','img');cells.setAttribute('aria-label',notationLabel(visual));
  for(const text of visual.cells){const cell=document.createElement('span');cell.textContent=text;cells.append(cell);}figure.append(cells);
 }else{
  const viewport=document.createElement('div'),host=document.createElement('div');viewport.className='score-viewport';host.className='notation';host.textContent='악보 준비 중';viewport.append(host);figure.append(viewport);
  void loadEngraver().then(V=>{
   if(!host.isConnected)return;
   host.replaceChildren();const width=Math.max(300,visual.notes.length*46+75),renderer=new V.Renderer(host,V.Renderer.Backends.SVG);renderer.resize(width,130);
   const ctx=renderer.getContext();ctx.setFillStyle('#18202b');ctx.setStrokeStyle('#18202b');
   const stave=new V.Stave(8,20,width-16);stave.addClef('treble');if(visual.time)stave.addTimeSignature(visual.time);stave.setContext(ctx).draw();
   const notes=visual.notes.map(n=>{const note=new V.StaveNote({keys:engravingKeys(n),duration:n.duration,type:n.rest?'r':'n',dots:n.dots??0,autoStem:true});for(let i=0;i<(n.dots??0);i++)V.Dot.buildAndAttach([note],{all:true});return note;});
   V.Formatter.FormatAndDraw(ctx,stave,notes,{autoBeam:false});
   const svg=host.querySelector('svg')!;svg.setAttribute('viewBox',`0 0 ${width} 130`);svg.setAttribute('role','img');svg.setAttribute('aria-label',notationLabel(visual));host.dataset.ready='true';
  }).catch(()=>{if(host.isConnected){host.textContent='악보를 불러오지 못했어요. 화면을 다시 열어 주세요.';host.dataset.error='true';}});
  if(zoomable){const zoom=document.createElement('button');zoom.type='button';zoom.className='visual-zoom icon';zoom.title='악보 확대';zoom.setAttribute('aria-label','악보 확대');zoom.setAttribute('aria-pressed','false');zoom.append(createElement(ZoomIn));zoom.onclick=()=>{const on=viewport.classList.toggle('zoomed');zoom.replaceChildren(createElement(on?ZoomOut:ZoomIn));zoom.setAttribute('aria-pressed',String(on));zoom.title=on?'악보 축소':'악보 확대';zoom.setAttribute('aria-label',zoom.title);};figure.append(zoom);}
 }
 if(visual.caption){const caption=document.createElement('figcaption');caption.textContent=visual.caption;figure.append(caption);}
 return figure;
}
