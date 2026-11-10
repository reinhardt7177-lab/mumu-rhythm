export type GradeBand='3-4'|'5-6';
export type InstrumentId='piano'|'flute'|'violin'|'trumpet'|'clarinet'|'cello';
export type LessonId='pulse'|'rhythm'|'rest'|'duration'|'pitch'|'melody'|'dynamics'|'tempo'|'timbre'|'harmony'|'form'|'gugak';
export interface ScoreNote{keys?:string[];duration:'w'|'h'|'q'|'8'|'16';rest?:boolean;dots?:number}
export type Visual={kind:'score';notes:ScoreNote[];time?:string;caption?:string}|{kind:'labels';cells:string[];caption?:string};
export interface SoundEvent{beat:number;duration:number;midi:number|number[];velocity?:number}
export interface ListeningClip{id:string;instrument:InstrumentId;bpm:number;events:SoundEvent[];label?:string}
export interface Choice{text:string;visual?:Visual}
export interface BankQuestion{
 id:string;lessonId:LessonId;grade:GradeBand;kind:'visual'|'listening'|'concept';prompt:string;
 choices:Choice[];correct:number;why:string;misconceptions:string[];visual?:Visual;audio?:ListeningClip[];
}
export interface LessonContent{intro:string;example:string;guide:string;pitfall:string;visual?:Visual;audio?:ListeningClip[]}
export interface Lesson{id:LessonId;title:string;goals:string[];prerequisites:LessonId[];standards:Record<GradeBand,string[]>;levels:Record<GradeBand,LessonContent>}
export interface Activity{id:string;grade:GradeBand;lessonId:LessonId;title:string;task:string;materials:string[];steps:string[];checkpoints:string[];reflection:string}
export interface InstrumentAsset{id:InstrumentId;url:string;rootMidi:number;gain:number;credit:string;sourceUrl:string;license:string;licenseUrl:string}
