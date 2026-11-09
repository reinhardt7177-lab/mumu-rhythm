import{spawnSync}from'node:child_process';import{resolve}from'node:path';
const runtime='C:/Users/JNEPC/.codex/tools/pixelfx',palette=['#30132d','#672d42','#ae4c4f','#da884e','#f6bf61','#ffe39a','#fff1cf','#ffffff'];
for(const id of ['impacts/crit-hit','arcane/rune-circle','lightning/zap-hit','arcane/mana-burst']){
 const r=spawnSync(process.execPath,['tools/render.mjs',id,'--sheet','--no-actor','--opts',JSON.stringify({palette}),'--out',resolve('public/assets/pixelfx-v5/theater')],{cwd:runtime,stdio:'inherit'});if(r.status)process.exit(r.status);
}
