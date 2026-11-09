import {createRequire} from 'node:module';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
const sharp=createRequire(import.meta.url)(arg('--sharp')||'sharp');
const source=arg('--source-dir');if(!source)throw new Error('Missing --source-dir');
const out=path.resolve('public/assets/art/actors-v3'),archive=path.resolve('output/note-knights/actors-v3/source');
await mkdir(out,{recursive:true});await mkdir(archive,{recursive:true});
const sources={past:'exec-d8854dc3-9abd-4ec4-bea3-8d8bd68df61b.png',present:'exec-671fdc55-1c55-49f6-a791-3bd932b8f2c7.png',future:'exec-309ea9c9-8dd5-466e-b44b-dc1cd2ad9e9f.png',fantasy:'exec-3da6313c-c660-4ab9-9a4a-6099f936fd2d.png'};
const groups=[[0,1,2,3],[4,5],[6,7],[8,9],[10,11]];
function subjectBounds(data,width,height){
 const visited=new Uint8Array(width*height),queue=new Int32Array(width*height);let best={area:0,left:0,top:0,right:0,bottom:0};
 for(let start=0;start<visited.length;start++){
  if(visited[start]||data[start*4+3]<=96)continue;
  let head=0,tail=1,area=0,left=width,top=height,right=0,bottom=0;queue[0]=start;visited[start]=1;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);area++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;const next=ny*width+nx;if(!visited[next]&&data[next*4+3]>96){visited[next]=1;queue[tail++]=next;}}
  }
  if(area>best.area)best={area,left,top,right,bottom};
 }
 return best;
}
const manifest={};
for(const [id,file]of Object.entries(sources)){
 await copyFile(path.join(source,file),path.join(archive,id+'.png'));
 const image=sharp(path.join(source,file)),meta=await image.metadata(),frames=[];
 for(let i=0;i<12;i++){
  const x0=Math.round(i%4*meta.width/4),y0=Math.round(Math.floor(i/4)*meta.height/3);
  const width=Math.round((i%4+1)*meta.width/4)-x0,height=Math.round((Math.floor(i/4)+1)*meta.height/3)-y0;
  const {data,info}=await image.clone().extract({left:x0,top:y0,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=width,top=height,right=0,bottom=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const p=(y*width+x)*4;
   if(data[p+3]<32){data[p]=data[p+1]=data[p+2]=data[p+3]=0;}
   if(data[p+3]>96){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  // Discard isolated fragments from neighboring cells and detached generation noise.
  ({left,top,right,bottom}=subjectBounds(data,width,height));
  if(right<=left||bottom<=top)throw new Error(`${id} empty frame ${i}`);
  let sum=0,count=0;
  for(let y=Math.max(top,bottom-12);y<=bottom;y++)for(let x=left;x<=right;x++)if(data[(y*width+x)*4+3]>128){sum+=x;count++;}
  frames.push({data,info,left,top,width:right-left+1,height:bottom-top+1,foot:count?sum/count-left:(right-left+1)/2});
 }
 const pieces=[];
 for(const group of groups){
  const members=group.map(i=>frames[i]);
  const scale=Math.min(108/Math.max(...members.map(f=>f.height)),58/Math.max(...members.map(f=>f.foot)),58/Math.max(...members.map(f=>f.width-f.foot)));
  for(const i of group){
   const f=frames[i],w=Math.max(1,Math.round(f.width*scale)),h=Math.max(1,Math.round(f.height*scale));
   const input=await sharp(f.data,{raw:f.info}).extract({left:f.left,top:f.top,width:f.width,height:f.height}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
   pieces.push({input,left:i%4*128+Math.round(64-f.foot*scale),top:Math.floor(i/4)*128+120-h});
  }
 }
 await sharp({create:{width:512,height:384,channels:4,background:'#00000000'}}).composite(pieces).png().toFile(path.join(out,id+'.png'));
 manifest[id]={columns:4,rows:3,frameSize:128,anchor:[64,120],groups};
}
const contact=[];
for(const [row,id]of Object.keys(sources).entries())for(const [column,frame]of [0,4,6,8,10].entries()){
 const input=await sharp(path.join(out,id+'.png')).extract({left:frame%4*128,top:Math.floor(frame/4)*128,width:128,height:128}).png().toBuffer();
 contact.push({input,left:column*128,top:row*128});
}
await sharp({create:{width:640,height:512,channels:4,background:'#242329'}}).composite(contact).png().toFile(path.resolve('output/note-knights/actors-v3/cast-contact.png'));
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));
