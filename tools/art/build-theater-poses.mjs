import{createRequire}from'node:module';import{mkdir,copyFile,writeFile}from'node:fs/promises';import path from'node:path';
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined};
const sharp=createRequire(import.meta.url)(arg('--sharp')||'sharp'),source=arg('--source');if(!source)throw new Error('Missing --source');
const out=path.resolve(arg('--out')||'public/assets/art/theater-v6'),archive=path.resolve(arg('--archive')||'output/note-knights/theater-v6');await mkdir(out,{recursive:true});await mkdir(archive,{recursive:true});await copyFile(source,path.join(archive,'source.png'));
const image=sharp(source),meta=await image.metadata(),frames=[];
for(let i=0;i<8;i++){
 const left=Math.round(i%4*meta.width/4),top=Math.round(Math.floor(i/4)*meta.height/2),width=Math.round((i%4+1)*meta.width/4)-left,height=Math.round((Math.floor(i/4)+1)*meta.height/2)-top;
 const{data,info}=await image.clone().extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=width,y0=height,x1=0,y1=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>96){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 let foot=0,count=0;for(let y=y1-8;y<=y1;y++)for(let x=x0;x<=x1;x++)if(data[(y*width+x)*4+3]>128){foot+=x;count++}
 if(!count)throw new Error('Empty pose '+i);frames.push({data,info,x0,y0,w:x1-x0+1,h:y1-y0+1,foot:foot/count-x0});
}
const reach=64-Number(arg('--margin')??10);
const scale=Math.min(Number(arg('--height')??88)/frames[0].h,reach/Math.max(...frames.map(f=>f.foot)),reach/Math.max(...frames.map(f=>f.w-f.foot))),pieces=[],manifest=[];
for(const[i,f]of frames.entries()){
 const w=Math.round(f.w*scale),h=Math.round(f.h*scale),left=Math.round(64-f.foot*scale),top=120-h;
 const input=await sharp(f.data,{raw:f.info}).extract({left:f.x0,top:f.y0,width:f.w,height:f.h}).resize(w,h,{kernel:'nearest'}).png().toBuffer();pieces.push({input,left:i%4*128+left,top:Math.floor(i/4)*128+top});manifest.push({frame:i,left,top,width:w,height:h,pivot:[64,120]});
}
await sharp({create:{width:512,height:256,channels:4,background:'#00000000'}}).composite(pieces).png().toFile(path.join(out,arg('--name')||'conductor.png'));
await sharp({create:{width:512,height:256,channels:4,background:'#23212b'}}).composite(pieces).png().toFile(path.join(archive,'poses-contact.png'));
await writeFile(path.join(out,'manifest.json'),JSON.stringify({source:path.basename(source),columns:4,rows:2,cell:128,frames:manifest},null,2));console.log(JSON.stringify(manifest));
