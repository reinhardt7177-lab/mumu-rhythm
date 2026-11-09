import './style.css';
import { createIcons, Pause, Play, Info, LayoutGrid, ArrowRight, RotateCcw, X, Headphones, Music2, Maximize, Minimize } from 'lucide';
import { songDurationSeconds } from '../content/songs';
import { AudioEngine } from '../engine/audio';
import { RhythmGame, type GameSnapshot, type JudgeEvent } from '../engine/game';
import type { PlayMode, Song } from '../types';
import { Combat, ENEMIES } from './combat';
import { Battlefield } from './battlefield';
import { WORLDS, songForWorld, questionsFor, type MusicalWorld } from './worlds';
import { NoteTrack } from './noteTrack';
import { renderApp } from './view';
import { MUSIC_LIBRARY, librarySong } from './catalog';
import {previewScene,spriteRect} from './sceneLayout';
import{holdForInput}from'./laneInput';

document.querySelector<HTMLDivElement>('#app')!.innerHTML=renderApp();
const icons={Pause,Play,Info,LayoutGrid,ArrowRight,RotateCcw,X,Headphones,Music2,Maximize,Minimize};
createIcons({icons});
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const briefing=el<HTMLDialogElement>('briefing'),paused=el<HTMLDialogElement>('paused'),results=el<HTMLDialogElement>('results');
const audio=new AudioEngine();
const battlefield=new Battlefield(el<HTMLCanvasElement>('world'));
const notes=el<HTMLCanvasElement>('notes');
const laneButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-lane]')];
const track=new NoteTrack(notes,laneButtons,el('judge'));
const pressed=new Map<string,string>();
let world=WORLDS[0],song=songForWorld(world.id),combat=new Combat();
let snapshot:GameSnapshot|null=null,running=false,starting=false,mode:PlayMode='challenge';
let questions=questionsFor(song);
let filterWorld:string|null=null;
let finaleFrame=0;

const duration=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function selectWorld(next:MusicalWorld,nextSong:Song=songForWorld(next.id)) {
  if(running||starting)return;
  world=next;song=nextSong;questions=questionsFor(song);
  const root=el('app');
  root.style.setProperty('--accent',world.accent);root.style.setProperty('--world-surface',world.surface);
  root.style.setProperty('--actor-sheet',`url('${world.actors}')`);
  root.style.setProperty('--world-image',`url('${world.background}')`);
  root.dataset.worldTheme=world.id;
  el<HTMLImageElement>('worldArt').src=world.background;
  el<HTMLImageElement>('worldArt').alt=world.title+' 픽셀 풍경';
  el('eraLabel').textContent=world.era;
  el('worldTitle').textContent=world.title;
  el('worldStory').textContent=world.atmosphere;
  el('worldIndex').textContent=String(WORLDS.indexOf(world)+1).padStart(2,'0');
  el('selectedSong').textContent=song.title;
  el('selectedSongTitle').textContent=song.title;
  el('selectedMeta').textContent=`${song.featuredInstrument} · ${duration(songDurationSeconds(song))}`;
  el('footerWorld').textContent=world.title;
  document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.world===filterWorld)));
  el('allSongs').setAttribute('aria-pressed',String(filterWorld===null));
  track.setTheme(world.id);battlefield.setWorld(world);battlefield.draw(0,combat);
  el('journey').innerHTML=world.stops.map((stop,i)=>`<span data-stop="${i}">${String(i+1).padStart(2,'0')} ${stop}</span>`).join('');
  el('libraryCount').textContent=`${MUSIC_LIBRARY.length}곡`;
  el('songList').innerHTML=MUSIC_LIBRARY.filter(item=>!filterWorld||item.worldId===filterWorld).map(({song:item},i)=>`<button class="song-row" data-song="${item.id}" aria-pressed="${item.id===song.id}"><span class="song-number">${String(i+1).padStart(2,'0')}</span><span class="song-row-text"><strong>${item.title}</strong><small>${item.featuredInstrument}</small></span><span class="song-duration">${duration(songDurationSeconds(item))}</span></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-song]').forEach(button=>button.onclick=()=>{const item=librarySong(button.dataset.song!);selectWorld(WORLDS.find(w=>w.id===item.worldId)!,item.song);});
  placePreview();
}

function openBriefing() {
  if(starting||running)return;
  el('briefTitle').textContent=song.title;el('briefOrigin').textContent=song.origin;
  el('briefIntroduction').textContent=librarySong(song.id).introduction;
  el('briefInstruments').textContent=song.instruments.join(' · ');
  el('briefDuration').textContent=duration(songDurationSeconds(song));
  el('briefFocus').textContent=song.listeningPoint;
  el('briefEra').textContent=world.era+' / '+world.title;
  el('briefArt').style.backgroundImage=`url('${world.background}')`;
  el('loading').textContent='';briefing.showModal();
}

function draw(s:GameSnapshot) {
  track.draw(s,mode);
  battlefield.setHolding(s.notes.some(note=>note.holding&&!note.completed),s.songTime);
  battlefield.impact(combat.advance(s.songTime,s.progress));battlefield.draw(s.songTime,combat);
  el('score').textContent=s.score.toLocaleString();el('combo').textContent=String(s.combo);
  el<HTMLProgressElement>('progress').value=s.progress;el('time').textContent=duration(Math.max(0,s.songTime));
  const enemy=ENEMIES[combat.stage];
  el('enemyName').textContent=world.enemyNames[combat.stage];el('location').textContent=world.stops[combat.stage];
  el('hpLabel').textContent=`${combat.hp} / ${enemy.hp}`;
  el<HTMLProgressElement>('enemyHp').max=enemy.hp;el<HTMLProgressElement>('enemyHp').value=combat.hp;
  el<HTMLProgressElement>('harmony').value=combat.harmony;
  el('skill').textContent=battlefield.attackName(s.combo);el('kills').textContent=`${combat.kills} / 4`;
  el('stageCount').textContent=`${combat.stage+1} / 4`;
  el('chapterLabel').textContent=combat.won?'모든 소리를 되찾았어요':world.era+' / '+world.title;
  el('story').textContent=combat.won?'이 세계에 다시 음악이 흐릅니다.':combat.hp<=0?'다음 악장의 문이 열리고 있어요.':combat.stage===0?world.atmosphere:song.listeningPoint;
  document.querySelectorAll('[data-stop]').forEach((n,i)=>n.classList.toggle('active',i===combat.stage));
}

function judge(e:JudgeEvent) {
  const time=e.songTime??snapshot?.songTime??0;
  if(e.judge==='MISS'){combat.miss();track.feedback(e,time);return;}
  const attack=combat.launch(e.judge==='PERFECT',e.combo,time,!!e.hold);
  if(attack)battlefield.attack(attack);
  else battlefield.celebrate(e.combo,time);
  track.feedback(e,time);
}

const game=new RhythmGame(audio,{
  onFrame:s=>{snapshot=s;draw(s);},onJudge:judge,onSection:()=>{},
  onComplete:r=>{
    battlefield.impact(combat.finish());if(snapshot)draw(snapshot);
    running=false;audio.stop();pressed.clear();track.clearInput();
    if(snapshot)track.draw({...snapshot,paused:true},mode);
    battlefield.setHolding(false,snapshot?.songTime??0);
    el('ending').textContent=combat.won?'이 세계의 음악을 되찾았어요!':'소리를 모으는 작은 모험';
    el('endingTag').textContent=song.title+' / '+world.era;
    el('stats').textContent=`수집률 ${r.accuracy}% · 최고 콤보 ${r.maxCombo} · 처치 ${combat.kills}/4`;
    el('lesson').textContent=song.listeningPoint+'. 같은 가락이 다시 나오면 반복, 강하게 연주하라는 표시는 포르테(f)예요.';
    el('quiz').innerHTML=questions.map((q,i)=>`<fieldset><legend>${i+1}. ${q.q}</legend>${q.a.map((a,j)=>`<label><input type="radio" name="q${i}" value="${j}">${a}</label>`).join('')}</fieldset>`).join('');
    el('explanation').textContent='';
    const time=snapshot?.songTime??0,remaining=battlefield.finaleRemaining(time);
    if(remaining>0){
      const began=performance.now();
      const finishVisual=()=>{
        const elapsed=(performance.now()-began)/1000;
        battlefield.draw(time+elapsed,combat);
        if(elapsed>=remaining){finaleFrame=0;results.showModal();}
        else finaleFrame=requestAnimationFrame(finishVisual);
      };
      finaleFrame=requestAnimationFrame(finishVisual);
    }else results.showModal();
  },
});

async function start() {
  if(starting)return;starting=true;
  cancelAnimationFrame(finaleFrame);finaleFrame=0;
  el<HTMLButtonElement>('start').disabled=true;el<HTMLButtonElement>('closeBriefing').disabled=true;
  el('loading').textContent='음악을 준비하고 있어요…';
  try {
    combat=new Combat();snapshot=null;pressed.clear();track.reset();battlefield.setWorld(world);
    await Promise.all([battlefield.ready,track.ready]);
    await game.start(song,mode);running=true;
    briefing.close();results.close();paused.close();
    el('library').hidden=true;el('arena').hidden=false;document.querySelector<HTMLElement>('.quest')!.dataset.screen='game';
    el('headerChapter').textContent=world.title;el('playingTitle').textContent='♪ '+song.title;
    el('modeLabel').textContent=mode==='explore'?'바를 터뜨려요':'박 맞추기';
    el<HTMLButtonElement>('pause').disabled=false;el<HTMLButtonElement>('home').disabled=false;
  } catch {
    game.stop();running=false;paused.close();results.close();
    if(!briefing.open)briefing.showModal();
    el('loading').textContent='음원을 불러오지 못했어요. 다시 눌러 주세요.';
  } finally {
    starting=false;el<HTMLButtonElement>('start').disabled=false;el<HTMLButtonElement>('closeBriefing').disabled=false;
  }
}

function releaseAll() {
  for(const id of new Set(pressed.values()))game.releaseNote(id,performance.now());
  pressed.clear();track.clearInput();
}
async function pause() {
  if(!running||starting)return;
  releaseAll();const p=await game.togglePause();if(snapshot){snapshot.paused=p;draw(snapshot);}
  if(p)paused.showModal();else paused.close();
}
function home() {
  if(starting)return;
  cancelAnimationFrame(finaleFrame);finaleFrame=0;
  game.stop();running=false;snapshot=null;pressed.clear();track.reset();combat=new Combat();
  [briefing,paused,results].forEach(d=>d.close());
  el('library').hidden=false;el('arena').hidden=true;document.querySelector<HTMLElement>('.quest')!.dataset.screen='library';
  el('headerChapter').textContent='음악으로 떠나는 네 개의 세계';
  el<HTMLButtonElement>('pause').disabled=true;el<HTMLButtonElement>('home').disabled=true;
  selectWorld(world,song);el('openBriefing').focus();
}

el('openBriefing').onclick=openBriefing;
el('closeBriefing').onclick=()=>briefing.close();
briefing.oncancel=e=>{if(starting)e.preventDefault();};
paused.oncancel=e=>{e.preventDefault();void pause();};
el('start').onclick=()=>void start();el('pause').onclick=()=>void pause();el('resume').onclick=()=>void pause();
el('restartPause').onclick=()=>void start();el('again').onclick=()=>{results.close();home();openBriefing();};
for(const id of ['home','leavePause','resultHome'])el(id).onclick=home;
document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b=>b.onclick=()=>{filterWorld=b.dataset.world!;selectWorld(WORLDS.find(w=>w.id===filterWorld)!);});
el('allSongs').onclick=()=>{filterWorld=null;selectWorld(world,song);};
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode==='challenge'?'challenge':'explore';document.querySelectorAll('[data-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));});
function inputAllowed(){return running&&!starting&&!snapshot?.paused&&!document.querySelector('dialog[open]');}
function ownHold(key:string,lane:number,result:ReturnType<RhythmGame['pressLane']>,noteId?:string){
  const id=holdForInput(result,snapshot?.notes??[],lane,noteId);if(id)pressed.set(key,id);
}
function press(lane:number,key:string,time:number){if(!inputAllowed())return;track.press(lane,key);ownHold(key,lane,game.pressLane(lane,time));}
function releaseInput(key:string,time:number){
  track.release(key);const id=pressed.get(key);pressed.delete(key);
  if(id&&![...pressed.values()].includes(id))game.releaseNote(id,time);
}
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'){if(running&&!document.querySelector('dialog[open]')){e.preventDefault();void pause();}return;}
  const lane=['KeyA','KeyS','KeyD','KeyJ','KeyK'].indexOf(e.code);
  if(lane<0||e.repeat||!inputAllowed())return;e.preventDefault();press(lane,e.code,e.timeStamp);
});
window.addEventListener('keyup',e=>releaseInput(e.code,e.timeStamp));
notes.onpointerdown=e=>{
  if(!inputAllowed())return;e.preventDefault();
  if(mode==='challenge'){
    const r=notes.getBoundingClientRect(),lane=Math.floor((e.clientX-r.left)/r.width*5);
    if(lane<0||lane>4)return;
    press(lane,String(e.pointerId),e.timeStamp);
    notes.setPointerCapture(e.pointerId);
    return;
  }
  const rect=notes.getBoundingClientRect(),lane=Math.floor((e.clientX-rect.left)/rect.width*5);
  if(lane<0||lane>=5)return;
  track.press(lane,String(e.pointerId));notes.setPointerCapture(e.pointerId);
  const target=track.targetAt(e.clientX,e.clientY);if(!target)return;
  const hit=game.pressNote(target.id,e.timeStamp);
  ownHold(String(e.pointerId),lane,hit,target.id);
};
function release(e:PointerEvent){releaseInput(String(e.pointerId),e.timeStamp);}
notes.onpointerup=release;notes.onpointercancel=release;notes.onlostpointercapture=release;
laneButtons.forEach(b=>{b.onpointerdown=e=>{if(!inputAllowed())return;e.preventDefault();press(Number(b.dataset.lane),`b${e.pointerId}`,e.timeStamp);b.setPointerCapture(e.pointerId);};b.onpointerup=e=>releaseInput(`b${e.pointerId}`,e.timeStamp);b.onpointercancel=b.onpointerup;b.onlostpointercapture=b.onpointerup;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!snapshot?.paused)void pause();});
window.addEventListener('blur',releaseAll);
el('answer').onclick=()=>{
  const answers=questions.map((_,i)=>document.querySelector<HTMLInputElement>(`input[name="q${i}"]:checked`));
  if(answers.some(x=>!x)){el('explanation').textContent='세 문제를 모두 골라 주세요.';return;}
  const count=answers.filter((x,i)=>Number(x!.value)===questions[i].correct).length;
  el('explanation').textContent=`${count}/3 정답! `+questions.map(q=>q.why).join(' ');
};
el('credits').onclick=async()=>{
  if(running&&!snapshot?.paused)await pause();
  const info=librarySong(song.id),container=el('musicCredit');container.replaceChildren();
  const text=document.createElement('p');text.textContent=info.credit+' '+info.license+(info.changes?' '+info.changes:'');container.append(text);
  for(const [label,url]of [['녹음 원문',info.sourceUrl],['이용 조건',info.licenseUrl]] as const)if(url){const link=document.createElement('a');link.href=url;link.textContent=label;link.target='_blank';link.rel='noopener';container.append(link,document.createElement('br'));}
  el<HTMLDialogElement>('creditDialog').showModal();
};
document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.mode===mode)));
el('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await el('app').requestFullscreen();}catch{el('fullscreen').title='브라우저 전체화면 권한을 확인하세요';}};
document.addEventListener('fullscreenchange',()=>{const full=!!document.fullscreenElement;el('fullscreen').innerHTML=`<i data-lucide="${full?'minimize':'maximize'}"></i>`;el('fullscreen').setAttribute('aria-label',full?'전체화면 종료':'전체화면');el('fullscreen').title=full?'전체화면 종료':'전체화면';createIcons({icons});});
el<HTMLButtonElement>('pause').disabled=true;el<HTMLButtonElement>('home').disabled=true;
selectWorld(world);
function placePreview(){
  const preview=document.querySelector<HTMLElement>('.world-preview')!;
  const {width,height}=preview.getBoundingClientRect();
  if(!width||!height)return;
  const hero=document.querySelector<HTMLElement>('.travel-bard')!,enemy=document.querySelector<HTMLElement>('.travel-enemy')!;
  const heroSize=hero.getBoundingClientRect().height,enemySize=enemy.getBoundingClientRect().height;
  const layout=previewScene(world.id,width,height,heroSize,enemySize),image=el('worldArt');
  Object.assign(image.style,{left:`${layout.background.x}px`,top:`${layout.background.y}px`,width:`${layout.background.width}px`,height:`${layout.background.height}px`});
  for(const [element,anchor,size]of [[hero,layout.hero,heroSize],[enemy,layout.enemy,enemySize]] as const){
    const rect=spriteRect(anchor,size);
    Object.assign(element.style,{left:`${rect.x}px`,top:`${rect.y}px`,right:'auto',bottom:'auto'});
  }
  preview.dataset.compact=String(height<550);
}
new ResizeObserver(placePreview).observe(document.querySelector('.world-preview')!);
void battlefield.ready.then(()=>{if(!running)battlefield.draw(0,combat);});
