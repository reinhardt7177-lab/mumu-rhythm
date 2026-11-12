import{VISUAL_QUESTIONS}from'./visualQuestions';
import{LISTENING_QUESTIONS}from'./listeningQuestions';
import{CONCEPT_QUESTIONS}from'./conceptQuestions';
import type{BankQuestion,GradeBand,LessonId}from'./types';
export{LESSONS}from'./lessons';
export{ACTIVITIES}from'./activities';
export const QUESTIONS:readonly BankQuestion[]=[...VISUAL_QUESTIONS,...LISTENING_QUESTIONS,...CONCEPT_QUESTIONS];
const focuses:Record<string,LessonId[]>={
 'can-can':['pulse','rhythm','dynamics','form'],'turkish-march':['duration','melody','pitch','rhythm'],
 'william-tell':['timbre','pulse','tempo','rhythm'],'cloud-hop':['melody','rest','pitch','timbre'],
 'neon-run':['harmony','rhythm','tempo','timbre'],'robot-parade':['pulse','rhythm','rest','form'],
 'rooftop-swing':['rhythm','pulse','timbre','harmony'],'moonlight-waltz':['pulse','melody','harmony','timbre'],
 'bach-prelude':['harmony','duration','pitch','form'],'beethoven-fifth':['rhythm','rest','dynamics','form'],
 'morning-mood':['melody','pitch','timbre','dynamics'],'mountain-king':['tempo','dynamics','form','pulse'],
 'borodin-scherzo':['timbre','rhythm','duration','melody'],'brahms-tragic':['dynamics','rest','harmony','form'],
 'tchaikovsky-march':['pulse','rhythm','timbre','tempo'],'bach-fugue':['melody','harmony','pitch','form'],
};
export function quizFor(songId:string,grade:GradeBand,round=0):BankQuestion[]{
 const focus=Object.hasOwn(focuses,songId)?focuses[songId]:['pulse','duration','rest','pitch'];
 let seed=0;for(const character of songId)seed=(seed*31+character.charCodeAt(0))>>>0;
 const offset=seed+Math.max(0,Math.floor(Number.isFinite(round)?round:0));
 const result:BankQuestion[]=[];
 for(const kind of['visual','listening','concept','visual','listening']as const){
  const pool=QUESTIONS.filter(q=>q.grade===grade&&q.kind===kind&&!result.some(x=>x.id===q.id));
  const preferred=pool.filter(q=>focus.includes(q.lessonId));
  const candidates=result.length<2&&preferred.length?preferred:pool;
  if(candidates.length)result.push(candidates[(offset+result.length)%candidates.length]);
 }
 return result;
}
