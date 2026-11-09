import{spawnSync}from'node:child_process';import{resolve}from'node:path';
const runtime='C:/Users/JNEPC/.codex/tools/pixelfx';
const palettes={present:['#1b243d','#294665','#327e8d','#43b9b1','#63ecd4','#a5ffda','#ecffe8','#ffffff'],future:['#1e143b','#443071','#7951b9','#b665ec','#ed9aff','#e4c8ff','#d7f7ff','#ffffff'],fantasy:['#2c213c','#584061','#8e648c','#be91b8','#e8b9d9','#ffe0db','#fff1b9','#ffffff']};
for(const[id,palette]of Object.entries(palettes))for(const effect of['impacts/crit-hit','arcane/rune-circle','lightning/zap-hit','arcane/mana-burst']){
 const r=spawnSync(process.execPath,['tools/render.mjs',effect,'--sheet','--no-actor','--opts',JSON.stringify({palette}),'--out',resolve('public/assets/pixelfx-v5/'+id)],{cwd:runtime,stdio:'inherit'});if(r.status)process.exit(r.status);
}
