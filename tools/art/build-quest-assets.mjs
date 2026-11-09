import { createRequire } from 'node:module';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const arg = name => args[args.indexOf(name) + 1];
const sharp = require(arg('--sharp') || 'sharp');
const sourceDir = arg('--source-dir');
if (!sourceDir) throw new Error('Provide --source-dir containing the generated originals');
const out = path.resolve('public/assets/art/quest-v1');
const archive = path.resolve('output/note-knights/source');
const worldOut = path.resolve('public/assets/art/worlds-v2');
await mkdir(out, { recursive: true });
await mkdir(archive, { recursive: true });
await mkdir(worldOut, { recursive: true });
const sources = {
  forest: 'exec-1287174b-9559-4bdd-8d3d-08ab4a33b75a.png',
  bard: 'exec-d4f8e6ab-a339-438a-b602-611c52371016.png',
  slime: 'exec-aa78cbef-3a2a-47d9-ad9b-21a84032d1c3.png',
  enemies: 'exec-3a7c3be2-6f42-42a9-8b5e-efcc830d1bf9.png',
  past: 'exec-254f389b-bdc2-4d98-9a60-ce001a450a75.png',
  present: 'exec-e4169c79-86b5-49f2-99d6-9667e7bd6850.png',
  future: 'exec-14153025-e117-4052-bf89-011c389a5b83.png',
};
for (const [name, file] of Object.entries(sources)) await copyFile(path.join(sourceDir, file), path.join(archive, `${name}-raw.png`));
await sharp(path.join(archive, 'forest-raw.png')).resize(960, 640, {kernel:'nearest'}).webp({quality:93}).toFile(path.join(out, 'forest.webp'));
for(const name of ['past','present','future'])await sharp(path.join(archive,`${name}-raw.png`)).resize(960,640,{kernel:'nearest'}).webp({quality:92}).toFile(path.join(worldOut,`${name}.webp`));

async function atlas(name, columns, rows, maxWidth, maxHeight) {
  const input = path.join(archive, `${name}-raw.png`);
  const meta = await sharp(input).metadata();
  const frames = [];
  for (let i = 0; i < columns * rows; i++) {
    const left = Math.round(i % columns * meta.width / columns);
    const top = Math.round(Math.floor(i / columns) * meta.height / rows);
    const width = Math.round((i % columns + 1) * meta.width / columns) - left;
    const height = Math.round((Math.floor(i / columns) + 1) * meta.height / rows) - top;
    const {data, info} = await sharp(input).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let x0=width,y0=height,x1=0,y1=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    frames.push({data,info,left:x0,top:y0,width:x1-x0+1,height:y1-y0+1});
  }
  const scale = Math.min(maxWidth/Math.max(...frames.map(f=>f.width)), maxHeight/Math.max(...frames.map(f=>f.height)));
  const pieces=[];
  for(const [i,f] of frames.entries()) {
    const width=Math.round(f.width*scale),height=Math.round(f.height*scale);
    const input=await sharp(f.data,{raw:f.info}).extract({left:f.left,top:f.top,width:f.width,height:f.height}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
    pieces.push({input,left:i%columns*128+Math.round((128-width)/2),top:Math.floor(i/columns)*128+120-height});
  }
  await sharp({create:{width:columns*128,height:rows*128,channels:4,background:'#00000000'}}).composite(pieces).png().toFile(path.join(out, `${name}.png`));
  return {columns,rows,frameSize:128,anchor:{x:64,y:120},frames:frames.length};
}
const manifest = {forest:{width:960,height:640},bard:await atlas('bard',4,2,108,108),slime:await atlas('slime',4,1,112,108),enemies:await atlas('enemies',3,3,110,110)};
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
