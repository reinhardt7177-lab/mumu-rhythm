import {feedbackKind,type FeedbackKind} from './feedback';
export const ENEMIES = [
  { name: '박자를 삼킨 슬라임', place: '01 · 메아리 숲', hp: 180, color: '#71edb5' },
  { name: '쉼표 유령', place: '02 · 잊힌 악보의 폐허', hp: 220, color: '#ac9dff' },
  { name: '불협화음 골렘', place: '03 · 침묵의 성문', hp: 260, color: '#f1ac76' },
  { name: '침묵의 마왕', place: '04 · 마지막 악장', hp: 220, color: '#ff6388' },
];
export const FLIGHT_SECONDS = .32;
export const COUNTER_FLIGHT_SECONDS = .38;
export const MAX_ENERGY = 100;
interface Counterattack {
  time: number;
  at: number;
  target: number;
  damage: number;
  loss?: number;
}
export interface MusicalAttack {
  time: number;
  at: number;
  target: number;
  damage: number;
  skill: boolean;
  kind: FeedbackKind;
  combo: number;
  hold?: boolean;
  defeated?: boolean;
}
export class Combat {
  private bossHp:number;
  private budgetFor?: (power:number,progress:number)=>number;
  private observedDamage=0;
  private observedJudges=0;
  constructor(budget:number|((power:number,progress:number)=>number)=ENEMIES[3].hp, private openingHp?:readonly[number,number,number]){
    this.bossHp=typeof budget==='number'&&Number.isFinite(budget)?Math.max(1,Math.round(budget)):ENEMIES[3].hp;
    if(typeof budget==='function')this.budgetFor=budget;
    this.hp=this.maxHp;
  }
  get maxHp(){return this.stage===3?this.bossHp:this.openingHp?.[this.stage]??ENEMIES[this.stage].hp;}
  get expectedDamagePerNote(){return this.observedJudges>=8?this.observedDamage/this.observedJudges:16.5;}
  private pending: MusicalAttack[] = [];
  private counter?: Counterattack;
  get counterattack(): Readonly<Counterattack> | undefined { return this.counter; }
  stage = 0;
  hp = ENEMIES[0].hp;
  energy = MAX_ENERGY;
  kills = 0;
  combo = 0;
  won = false;
  progress = 0;
  lastSkill = '8분음표 탄환';
  update(progress: number) {
    this.progress = progress;
    if (this.hp <= 0 && this.stage < 3 && progress >= (this.stage + 1) * .24) {
      this.stage++;
      if(this.stage===3&&this.budgetFor){const hp=this.budgetFor(this.expectedDamagePerNote,progress);if(Number.isFinite(hp))this.bossHp=Math.max(1,Math.round(hp));}
      this.hp = this.maxHp;
    }
  }
  private prepare(perfect: boolean, combo: number) {
    if (this.hp <= 0 || this.won) return 0;
    this.combo = combo;
    const skill = combo > 0 && combo % 8 === 0;
    const damage = skill ? 48 : perfect ? 18 : 12;
    this.lastSkill = skill ? '화음 폭발' : perfect ? '강세 음표' : '8분음표 탄환';
    return damage;
  }
  private apply(damage: number) {
    this.hp = Math.max(0, this.hp - damage);
    if (this.hp === 0) { this.kills++; if (this.stage === 3) this.won = true; }
  }
  hit(perfect: boolean, combo: number) {
    this.observe(perfect,combo);
    const damage = this.prepare(perfect, combo);
    if (damage) this.apply(damage);
    return damage;
  }
  launch(perfect: boolean, combo: number, time: number, hold=false): MusicalAttack | null {
    this.observe(perfect,combo);
    const damage = this.prepare(perfect, combo);
    if (!damage) return null;
    const attack = {time, at: time + FLIGHT_SECONDS, target: this.stage, damage, skill: combo > 0 && combo % 8 === 0,kind:feedbackKind(perfect,combo,hold),combo,hold};
    this.pending.push(attack);
    return attack;
  }
  advance(time: number, progress: number): MusicalAttack[] {
    const impacts: MusicalAttack[] = [];
    const waiting: MusicalAttack[] = [];
    // Resolve this encounter before changing targets, including on slow frames.
    for (const attack of this.pending) {
      if (attack.target !== this.stage || this.hp <= 0) continue;
      if (attack.at > time) { waiting.push(attack); continue; }
      this.resolveCounter(attack.at);
      this.apply(attack.damage);
      if(this.hp===0){attack.defeated=true;if(this.stage===3)attack.kind='boss';}
      impacts.push(attack);
    }
    this.pending = waiting;
    this.resolveCounter(time);
    this.update(progress);
    return impacts;
  }
  finish() {
    if (this.counter?.loss === undefined) this.counter = undefined;
    return this.advance(Infinity, this.progress);
  }
  private observe(perfect:boolean,combo:number){
    this.observedJudges++;
    this.observedDamage+=combo>0&&combo%8===0?48:perfect?18:12;
    this.energy=Math.min(MAX_ENERGY,this.energy+(perfect?3:2));
  }
  miss(time: number, damage = 8) {
    this.observedJudges++;
    this.combo = 0;
    if (this.hp <= 0 || this.won || this.counter && (this.counter.loss === undefined || time - this.counter.time < .55)) return;
    this.counter = { time, at: time + COUNTER_FLIGHT_SECONDS, target: this.stage, damage };
  }
  private resolveCounter(time: number) {
    const counter = this.counter;
    if (!counter || counter.loss !== undefined) return;
    if (counter.target !== this.stage || this.hp <= 0) { this.counter = undefined; return; }
    if (counter.at > time) return;
    counter.loss = Math.min(this.energy, counter.damage);
    this.energy -= counter.loss;
  }
}
