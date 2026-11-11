import './style.css';
import { createIcons, Pause, Play, Info, LayoutGrid, ArrowRight, RotateCcw, X, Headphones, Music2, Maximize, Minimize,BookOpen,Volume2 } from 'lucide';
import { songDurationSeconds } from '../content/songs';
import { doubleScroll } from '../core/scrollSpeed';
import { CHART_LEVELS, chartForLevel, encounterHealth, musicalLevels, type ChartLevel } from '../content/musicalChart';
import { AudioEngine } from '../engine/audio';
import { RhythmGame, type GameSnapshot, type JudgeEvent } from '../engine/game';
import type { PlayMode, Song } from '../types';
import { Combat, MAX_ENERGY } from './combat';
import { Battlefield } from './battlefield';
import { WORLDS, songForWorld, type MusicalWorld } from './worlds';
import { NoteTrack } from './noteTrack';
import { renderApp } from './view';
import { MUSIC_LIBRARY, librarySong } from './catalog';
import {previewScene,spriteRect} from './sceneLayout';
import{holdForInput}from'./laneInput';
import{BOSS_THEMES,bossBudget,type BossWorld}from'./boss';
import{LESSONS,quizFor}from'./bank';
import type{GradeBand,LessonId}from'./bank/types';
import{INSTRUMENT_ASSETS}from'./bank/audioAssets';
import{QuizAudio}from'./quizAudio';
import{QuizPanel}from'./quizPanel';
import{MusicNotebook}from'./musicNotebook';
import{HudWriter}from'./hudWriter';

document.querySelector<HTMLDivElement>('#app')!.innerHTML=renderApp();
const icons={Pause,Play,Info,LayoutGrid,ArrowRight,RotateCcw,X,Headphones,Music2,Maximize,Minimize,BookOpen,Volume2};
createIcons({icons});
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const hud=new HudWriter(id=>document.getElementById(id));
const briefing=el<HTMLDialogElement>('briefing'),paused=el<HTMLDialogElement>('paused'),results=el<HTMLDialogElement>('results');
const audio=new AudioEngine();
const quizAudio=new QuizAudio(INSTRUMENT_ASSETS);
const notebook=new MusicNotebook(quizAudio);
const resultQuiz=new QuizPanel(el('quiz'),quizAudio,id=>notebook.open(grade,id));
const battlefield=new Battlefield(el<HTMLCanvasElement>('world'));
const notes=el<HTMLCanvasElement>('notes');
const laneButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-lane]')];
const track=new NoteTrack(notes,laneButtons,el('judge'));
const pressed=new Map<string,string>();
let world=WORLDS[0],song=songForWorld(world.id),combat=new Combat();
let snapshot:GameSnapshot|null=null,running=false,starting=false,mode:PlayMode='challenge';
let grade:GradeBand='3-4';
let chartLevel:ChartLevel='pulse';
const chartLabel:Record<ChartLevel,string>={pulse:'가락',groove:'반주',melody:'합주'};
const counterDamage:Record<ChartLevel,number>={pulse:6,groove:8,melody:10};
const inputClickKey='mumu-quest-input-click';
let inputClick=localStorage.getItem(inputClickKey)!=='off';
let quizRound=0;
let filterWorld:string|null=null;
let finaleFrame=0;
let journeyStage=-1;

const duration=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function selectWorld(next:MusicalWorld,nextSong:Song=songForWorld(next.id)) {
  if(running||starting)return;
  world=next;song=nextSong;setLearning();
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
  journeyStage=-1;
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
  setLearning();
  el('loading').textContent='';briefing.showModal();
}

function conceptNotes(id:string,lessonIds=new Set<LessonId>(quizFor(song.id,grade).map(q=>q.lessonId))){
  const list=el(id);list.replaceChildren();
  for(const concept of LESSONS.filter(l=>lessonIds.has(l.id))){
    const term=document.createElement('dt'),body=document.createElement('dd');
    term.textContent=concept.title;body.textContent=concept.levels[grade].intro;list.append(term,body);
  }
}
function setLearning(){
  conceptNotes('briefConcepts');
  el('chartLevels').hidden=!musicalLevels(song);
  document.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.grade===grade)));
}
function prepareQuiz(){
  const questions=quizFor(song.id,grade,quizRound++);
  conceptNotes('resultConcepts',new Set(questions.map(q=>q.lessonId)));
  el('lesson').textContent=`초등 ${grade==='3-4'?'3~4':'5~6'}학년 · ${questions.length}문제`;
  resultQuiz.render(questions);
  const source=el<HTMLAnchorElement>('curriculumSource');source.href='https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=0302';
  el('explanation').textContent='';
}
function showResults(){results.showModal();results.scrollTop=0;}

function drawVitals(){
  hud.text('hpLabel',`${combat.hp} / ${combat.maxHp}`);hud.progress('enemyHp',combat.hp,combat.maxHp);
  hud.text('energyLabel',`${combat.energy} / ${MAX_ENERGY}`);hud.progress('heroEnergy',combat.energy,MAX_ENERGY);
}
function draw(s:GameSnapshot) {
  track.draw(s,mode);
  battlefield.setHolding(s.notes.some(note=>note.holding&&!note.completed),s.songTime);
  battlefield.impact(combat.advance(s.songTime,s.progress));battlefield.draw(s.songTime,combat,s.beat);
  hud.text('score',s.score.toLocaleString());hud.text('combo',s.combo);
  hud.progress('progress',s.progress);hud.text('time',duration(Math.max(0,s.songTime)));
  hud.text('enemyName',combat.stage===3?BOSS_THEMES[world.id as BossWorld].name:world.enemyNames[combat.stage]);hud.text('location',world.stops[combat.stage]);
  drawVitals();
  hud.text('bossCue',combat.stage===3?battlefield.bossCue:'');
  hud.text('skill',battlefield.attackName(s.combo));hud.text('kills',`${combat.kills} / 4`);
  hud.text('stageCount',`${combat.stage+1} / 4`);
  hud.text('chapterLabel',combat.won?'모든 소리를 되찾았어요':world.era+' / '+world.title);
  hud.text('story',combat.won?'이 세계에 다시 음악이 흐릅니다.':combat.hp<=0?'다음 악장의 문이 열리고 있어요.':combat.stage===0?world.atmosphere:song.listeningPoint);
  if(journeyStage!==combat.stage){journeyStage=combat.stage;document.querySelectorAll('[data-stop]').forEach((n,i)=>n.classList.toggle('active',i===combat.stage));}
}

function judge(e:JudgeEvent) {
  const time=e.songTime??snapshot?.songTime??0;
  if(e.judge==='MISS'){combat.miss(time,musicalLevels(song)?counterDamage[chartLevel]:8);track.feedback(e,time);return;}
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
    el('stats').textContent=`수집률 ${r.accuracy}% · 최고 콤보 ${r.maxCombo} · 처치 ${combat.kills}/4 · 남은 에너지 ${combat.energy}`;
    prepareQuiz();
    const time=snapshot?.songTime??0,remaining=battlefield.finaleRemaining(time);
    if(remaining>0){
      const began=performance.now();
      const finishVisual=()=>{
        const elapsed=(performance.now()-began)/1000;
        battlefield.draw(time+elapsed,combat);
        if(elapsed>=remaining){finaleFrame=0;showResults();}
        else finaleFrame=requestAnimationFrame(finishVisual);
      };
      finaleFrame=requestAnimationFrame(finishVisual);
    }else showResults();
  },
});

async function start() {
  if(starting)return;starting=true;
  quizAudio.stop();notebook.close();
  cancelAnimationFrame(finaleFrame);finaleFrame=0;
  el<HTMLButtonElement>('start').disabled=true;el<HTMLButtonElement>('closeBriefing').disabled=true;
  el('loading').textContent='음악을 준비하고 있어요…';
  try {
    const encounterSong=doubleScroll(chartForLevel(song,chartLevel)),encounterMode=mode;
    combat=new Combat((power,progress)=>bossBudget(encounterSong,encounterMode,power,progress,snapshot?.notes),encounterHealth(encounterSong));snapshot=null;journeyStage=-1;pressed.clear();track.reset();battlefield.setWorld(world);
    await Promise.all([battlefield.ready,track.ready]);
    await game.start(encounterSong,encounterMode);running=true;
    drawVitals();
    briefing.close();results.close();paused.close();
    el('library').hidden=true;el('arena').hidden=false;document.querySelector<HTMLElement>('.quest')!.dataset.screen='game';
    el('headerChapter').textContent=world.title;el('playingTitle').textContent='♪ '+song.title+(musicalLevels(song)?' · '+chartLabel[chartLevel]:'');
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
  quizAudio.stop();notebook.close();
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
el('inputClick').setAttribute('aria-pressed',String(inputClick));
el('inputClick').onclick=()=>{
 inputClick=!inputClick;localStorage.setItem(inputClickKey,inputClick?'on':'off');
 el('inputClick').setAttribute('aria-pressed',String(inputClick));
};
for(const id of ['home','leavePause','resultHome'])el(id).onclick=home;
document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b=>b.onclick=()=>{filterWorld=b.dataset.world!;selectWorld(WORLDS.find(w=>w.id===filterWorld)!);});
el('allSongs').onclick=()=>{filterWorld=null;selectWorld(world,song);};
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode==='challenge'?'challenge':'explore';document.querySelectorAll('[data-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));});
document.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(b=>b.onclick=()=>{grade=b.dataset.grade==='5-6'?'5-6':'3-4';setLearning();});
for(const level of CHART_LEVELS){
 const button=document.querySelector<HTMLButtonElement>(`[data-chart-level="${level}"]`)!;
 button.onclick=()=>{if(starting)return;chartLevel=level;document.querySelectorAll('[data-chart-level]').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));};
}
function inputAllowed(){return running&&!starting&&!snapshot?.paused&&!document.querySelector('dialog[open]');}
function ownHold(key:string,lane:number,result:ReturnType<RhythmGame['pressLane']>,noteId?:string){
  const id=holdForInput(result,snapshot?.notes??[],lane,noteId);if(id)pressed.set(key,id);
}
function beginInput(lane:number,key:string){
 if(!track.press(lane,key))return false;
 if(inputClick)audio.playKeyClick();
 return true;
}
function press(lane:number,key:string,time:number){if(!inputAllowed()||!beginInput(lane,key))return;ownHold(key,lane,game.pressLane(lane,time));}
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
  if(!beginInput(lane,String(e.pointerId)))return;
  notes.setPointerCapture(e.pointerId);
  const target=track.targetAt(e.clientX,e.clientY);if(!target)return;
  const hit=game.pressNote(target.id,e.timeStamp);
  ownHold(String(e.pointerId),lane,hit,target.id);
};
function release(e:PointerEvent){releaseInput(String(e.pointerId),e.timeStamp);}
notes.onpointerup=release;notes.onpointercancel=release;notes.onlostpointercapture=release;
laneButtons.forEach(b=>{b.onpointerdown=e=>{if(!inputAllowed())return;e.preventDefault();press(Number(b.dataset.lane),`b${e.pointerId}`,e.timeStamp);b.setPointerCapture(e.pointerId);};b.onpointerup=e=>releaseInput(`b${e.pointerId}`,e.timeStamp);b.onpointercancel=b.onpointerup;b.onlostpointercapture=b.onpointerup;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){quizAudio.stop();if(running&&!snapshot?.paused)void pause();}});
window.addEventListener('blur',releaseAll);
el('answer').onclick=()=>{
  el('explanation').textContent=resultQuiz.grade();
};
el('notebook').onclick=async()=>{if(running&&!snapshot?.paused)await pause();notebook.open(grade);};
results.addEventListener('close',()=>quizAudio.stop());
el('credits').onclick=async()=>{
  if(running&&!snapshot?.paused)await pause();
  const info=librarySong(song.id),container=el('musicCredit');container.replaceChildren();
  const text=document.createElement('p');text.textContent=info.credit+' '+info.license+(info.changes?' '+info.changes:'');container.append(text);
  for(const [label,url]of [['녹음 원문',info.sourceUrl],['이용 조건',info.licenseUrl]] as const)if(url){const link=document.createElement('a');link.href=url;link.textContent=label;link.target='_blank';link.rel='noopener';container.append(link,document.createElement('br'));}
  const sampleCredit=document.createElement('p');sampleCredit.textContent='학습용 악기 소리: '+INSTRUMENT_ASSETS.map(a=>a.credit).filter((s,i,a)=>a.indexOf(s)===i).join(' / ');container.append(sampleCredit);
  const sampleLink=document.createElement('a');sampleLink.href='/assets/audio/quiz-v1/manifest.json';sampleLink.textContent='학습 음원 원본·이용 조건';sampleLink.target='_blank';sampleLink.rel='noopener';container.append(sampleLink);
  const notationLink=document.createElement('a');notationLink.href='/assets/notation-licenses/NOTICE.txt';notationLink.textContent='악보 엔진·악보 글꼴 이용 조건';notationLink.target='_blank';notationLink.rel='noopener';container.append(document.createElement('br'),notationLink);
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
