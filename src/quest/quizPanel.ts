import{createElement,Play,Square,Volume2,BookOpen}from'lucide';
import{LESSONS}from'./bank';
import type{BankQuestion,LessonId,ListeningClip}from'./bank/types';
import{visualElement}from'./notation';
import{QuizAudio,type AudioState}from'./quizAudio';

export function evaluateQuiz(questions:readonly BankQuestion[],answers:readonly(number|null)[],unavailable=new Set<string>()){
 if(questions.some(q=>unavailable.has(q.id)))return{ready:false,reason:'unavailable'}as const;
 if(questions.some((q,i)=>answers[i]===null||!Number.isInteger(answers[i])||!q.choices[answers[i]!]))return{ready:false,reason:'unanswered'}as const;
 const items=questions.map((q,i)=>{const correct=answers[i]===q.correct;return{correct,text:correct?`정답이에요. ${q.why}`:`다시 살펴봐요. ${q.misconceptions[answers[i]!]} 정답: ${q.choices[q.correct].text}. ${q.why}`};});
 return{ready:true,count:items.filter(i=>i.correct).length,total:questions.length,items}as const;
}

export function soundControls(player:QuizAudio,clips:readonly ListeningClip[],onState?:(id:string,state:AudioState)=>void){
 const group=document.createElement('div');group.className='listening-controls';
 clips.forEach((clip,i)=>{
  const row=document.createElement('div'),button=document.createElement('button'),status=document.createElement('span');
  const label=clip.label??`소리 ${String.fromCharCode(65+i)}`;
  row.className='sound-row';button.type='button';button.append(createElement(Play),document.createTextNode(label));
  button.setAttribute('aria-label',`${label} 듣기`);button.dataset.state='idle';status.className='sound-status';status.setAttribute('role','status');
  button.onclick=()=>{
   if(button.dataset.state==='playing'||button.dataset.state==='loading'){player.stop();return;}
   void player.play(clip,state=>{
    onState?.(clip.id,state);
    if(!button.isConnected)return;
    button.dataset.state=state;button.replaceChildren(createElement(state==='playing'||state==='loading'?Square:Play),document.createTextNode(label));
    status.textContent=state==='loading'?'준비 중…':state==='playing'?'재생 중':state==='error'?'소리를 불러오지 못했어요. 다시 눌러 주세요.':'';
    button.setAttribute('aria-label',`${label} ${state==='playing'||state==='loading'?'정지':'듣기'}`);
   });
  };
  row.append(button,status);group.append(row);
 });
 return group;
}

export function volumeControl(player:QuizAudio){
 const label=document.createElement('label'),range=document.createElement('input');label.className='quiz-volume';
 range.type='range';range.min='0';range.max='100';range.value=String(Math.round(player.volumeLevel*100));range.setAttribute('aria-label','학습 소리 음량');
 range.oninput=()=>player.setVolume(Number(range.value)/100);
 label.append(createElement(Volume2),document.createTextNode('음량'),range);return label;
}

export class QuizPanel{
 private questions:readonly BankQuestion[]=[];
 private failed=new Map<string,Set<string>>();
 private pending=new Map<string,Set<string>>();
 private available=new Set<string>();
 private epoch=0;
 constructor(private root:HTMLElement,private player:QuizAudio,private onLesson:(id:LessonId)=>void,private prefix='q'){}
 render(questions:readonly BankQuestion[]){
  this.player.stop();const epoch=++this.epoch;this.questions=questions;this.failed.clear();this.pending.clear();this.available.clear();this.root.replaceChildren();
  this.root.append(volumeControl(this.player));
  questions.forEach((q,i)=>{
   const field=document.createElement('fieldset'),legend=document.createElement('legend');field.dataset.questionId=q.id;field.dataset.kind=q.kind;
   legend.textContent=`${i+1}. ${q.prompt}`;field.append(legend);
   if(q.visual)field.append(visualElement(q.visual));
   if(q.audio)field.append(soundControls(this.player,q.audio,(id,state)=>{
    if(epoch!==this.epoch)return;
    const failed=this.failed.get(q.id)??new Set<string>();
    if(state==='error')failed.add(id);else if(state==='playing')failed.delete(id);
    if(state==='playing')this.available.add(`${q.id}:${id}`);else if(state==='error')this.available.delete(`${q.id}:${id}`);
    this.failed.set(q.id,failed);
    const pending=this.pending.get(q.id)??new Set<string>();if(state==='loading')pending.add(id);else pending.delete(id);this.pending.set(q.id,pending);
   }));
   q.choices.forEach((choice,j)=>{
    const option=document.createElement('div'),input=document.createElement('input'),label=document.createElement('label');option.className='answer-option';
    input.type='radio';input.name=`${this.prefix}${i}`;input.id=`${this.prefix}${i}-${j}`;input.value=String(j);
    label.htmlFor=input.id;label.textContent=choice.text;option.append(input,label);
    if(choice.visual){const visual=visualElement(choice.visual);visual.classList.add('choice-visual');visual.id=`${input.id}-picture`;input.setAttribute('aria-describedby',visual.id);option.append(visual);}
    option.onclick=e=>{if(!(e.target as HTMLElement).closest('button')){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}};
    field.append(option);
   });
   const feedback=document.createElement('p');feedback.className='question-feedback';feedback.id=`${this.prefix}-feedback${i}`;feedback.hidden=true;feedback.setAttribute('aria-live','polite');field.setAttribute('aria-describedby',feedback.id);
   const link=document.createElement('button');link.type='button';link.className='lesson-link';link.append(createElement(BookOpen),document.createTextNode(`${LESSONS.find(l=>l.id===q.lessonId)?.title??'음악 요소'} 배우기`));
   link.onclick=()=>{this.player.stop();this.onLesson(q.lessonId);};field.append(feedback,link);this.root.append(field);
  });
 }
 grade(){
  const fields=[...this.root.querySelectorAll<HTMLFieldSetElement>('fieldset')];
  const answers=fields.map(f=>{const input=f.querySelector<HTMLInputElement>('input:checked');return input?Number(input.value):null;});
  const unavailable=new Set(this.questions.filter((q,i)=>this.failed.get(q.id)?.size||this.pending.get(q.id)?.size||q.audio?.some(c=>!this.available.has(`${q.id}:${c.id}`))||fields[i]?.querySelector('.notation:not([data-ready=true])')).map(q=>q.id));
  const result=evaluateQuiz(this.questions,answers,unavailable);
  if(!result.ready){
   fields.forEach((f,i)=>f.setAttribute('aria-invalid',String(result.reason==='unavailable'?unavailable.has(this.questions[i].id):answers[i]===null)));
   return result.reason==='unavailable'?'악보가 준비되면 각 소리를 먼저 재생해 주세요. 불러오지 못한 그림이나 소리는 다시 열어 확인해 주세요.':`${this.questions.length}문제의 답을 모두 골라 주세요.`;
  }
  result.items.forEach((item,i)=>{const feedback=fields[i].querySelector<HTMLElement>('.question-feedback')!;feedback.hidden=false;feedback.dataset.correct=String(item.correct);feedback.textContent=item.text;fields[i].removeAttribute('aria-invalid');});
  return`${result.count}/${result.total} 정답 · 문제 아래에서 해설을 확인하고 다시 풀 수 있어요.`;
 }
}
