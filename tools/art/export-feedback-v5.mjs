import {spawnSync}from'node:child_process';import{resolve}from'node:path';
const runtime='C:/Users/JNEPC/.codex/tools/pixelfx';
const cyan=['#071e36','#123d59','#1b7187','#29b9c7','#72e8e8','#b7ffef','#e5fff8','#ffffff'];
const jobs=[
 ['impacts/hit-spark',{}],['impacts/crit-hit',{palette:cyan}],
 ['arcane/rune-circle',{palette:cyan}],['lightning/zap-hit',{palette:cyan}],
 ['arcane/mana-burst',{palette:['#27142d','#50254e','#8d397a','#c34bac','#f47fd4','#ffc0ee','#ffe2fa','#ffffff']}],
 ['spawn/poof',{}],
];
for(const [id,options]of jobs){const r=spawnSync(process.execPath,['tools/render.mjs',id,'--sheet','--no-actor','--opts',JSON.stringify(options),'--out',resolve('public/assets/pixelfx-v5')],{cwd:runtime,stdio:'inherit'});if(r.status)process.exit(r.status);}
