import { Combat, FLIGHT_SECONDS, type MusicalAttack } from './combat';
import { WORLDS, type MusicalWorld } from './worlds';
import { ACTOR_WINDUP_SECONDS, heroFrame, enemyFrame } from './actors';
import {sceneActors,spriteRect} from './sceneLayout';
import {PixelEffects,type EffectId}from './pixelEffects';
import {FEEDBACK,finaleRemaining}from './feedback';
import{THEATER_FX,theaterAttack}from'./theaterAttack';
import{TheaterRenderer}from'./theaterRenderer';
import{WorldRenderer}from'./worldRenderer';
import{worldTheme,worldAttack,type ThemeWorld}from'./worldAttack';

interface Frame { x: number; y: number; w: number; h: number }
interface Atlas { frames: Record<string, { frame: Frame }> }

function picture(url: string) {
  const image = new Image();
  image.src = url;
  return image;
}

export class Battlefield {
  private ctx: CanvasRenderingContext2D;
  private flights: MusicalAttack[] = [];
  private impacts: MusicalAttack[] = [];
  private backgrounds = new Map(WORLDS.map(w=>[w.id,picture(w.background)]));
  private actors = new Map(WORLDS.map(w=>[w.id,picture(w.actors)]));
  private world = WORLDS[3];
  private fx=new PixelEffects();
  private theater=new TheaterRenderer();
  private themed=new WorldRenderer();
  private themeReady:Promise<unknown>=Promise.resolve();
  private holding=false;
  private holdAt=0;
  private bossAt:number|undefined;
  private encore:MusicalAttack|undefined;
  private levelUp = picture('/assets/pixelfx/ui/level-up/level-up.png');
  private levelFrames: Frame[] = [];
  private lastStage = 0;
  private levelAt = -10;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private baseReady:Promise<unknown>;
  get ready(){return Promise.all([this.baseReady,this.themeReady]);}

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = 480;
    canvas.height = 320;
    this.ctx = canvas.getContext('2d')!;
    this.baseReady = Promise.allSettled([...this.actors.values(),...this.backgrounds.values()].map(image => image.decode()).concat(this.fx.ready.then(()=>{}),this.theater.ready.then(()=>{}),this.themed.ready.then(()=>{})));
    void this.loadFrames('/assets/pixelfx/ui/level-up/level-up.json').then(frames => { this.levelFrames = frames; });
  }

  private async loadFrames(url: string): Promise<Frame[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const atlas: Atlas = await response.json();
      return Object.values(atlas.frames).map(value => value.frame);
    } catch { return []; }
  }

  reset() {
    this.flights = [];
    this.impacts = [];
    this.lastStage = 0;
    this.levelAt = -10;
    this.holding=false;this.holdAt=0;this.bossAt=undefined;this.encore=undefined;
  }

  setWorld(world: MusicalWorld) {
    this.world=world;this.reset();const theme=worldTheme(world.id);
    this.themeReady=this.fx.preload(theme?[...Object.values(theme.fx),theme.rune]:[...Object.values(THEATER_FX),'theater-rune']);
  }

  attack(attack: MusicalAttack) {
    this.flights.push(attack);
    if (this.flights.length > 32) this.flights.shift();
  }
  celebrate(combo:number,time:number){
    if(combo<=0||combo%64!==0||!Number.isFinite(time))return;
    // This visual-only encore never enters Combat or the projectile/damage queue.
    this.encore={time,at:time,target:0,damage:0,skill:true,kind:'combo',combo};
  }

  impact(attacks: MusicalAttack[]) {
    this.impacts.push(...attacks);
    for(const attack of attacks)if(attack.kind==='boss')this.bossAt=attack.at;
    if (this.impacts.length > 32) this.impacts.splice(0, this.impacts.length - 32);
  }
  setHolding(active:boolean,time:number){if(active&&!this.holding)this.holdAt=time;this.holding=active;}
  finaleRemaining(time:number){return finaleRemaining(this.bossAt,time);}
  attackName(combo:number){return worldTheme(this.world.id)?worldAttack(this.world.id as ThemeWorld,combo).name:theaterAttack(combo).name;}

  private rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  private note(x: number, y: number, color: string, size = 1) {
    this.rect(x, y, 7 * size, 5 * size, color);
    this.rect(x + 5 * size, y - 12 * size, 2 * size, 15 * size, color);
    this.rect(x + 7 * size, y - 12 * size, 5 * size, 3 * size, color);
  }

  private sprite(image: HTMLImageElement, frame: number, columns: number, x: number, feet: number, size: number) {
    if (!image.naturalWidth) return false;
    const rect=spriteRect({x, y:feet},size);
    this.ctx.drawImage(image, frame % columns * 128, Math.floor(frame / columns) * 128, 128, 128,
      Math.round(rect.x), Math.round(rect.y), size, size);
    return true;
  }

  private effect(image: HTMLImageElement, frames: Frame[], age: number, x: number, y: number, w: number, h: number) {
    if (age < 0 || !image.naturalWidth) return;
    const frame = frames[Math.floor(age * 30)];
    if (frame) this.ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, x, y, w, h);
  }

  private backdrop(stage: number) {
    const background=this.backgrounds.get(this.world.id);
    if (background?.naturalWidth) {
      this.ctx.drawImage(background, 0, 0, 480, 320);
      return;
    }
    this.rect(0, 0, 480, 320, ['#102c35', '#211e38', '#292039', '#30172d'][stage]);
    for (let i = 0; i < 48; i++) this.rect(i * 83 % 480, i * 29 % 160, 1, 1, '#9aadb8');
    for (let i = 0; i < 9; i++) {
      this.rect(i * 64 - 30, 110 - i % 3 * 13, 38, 140, '#243849');
      this.rect(i * 64 - 18, 140, 6, 4, '#507180');
    }
    for (let i = 0; i < 5; i++) {
      if (stage > 1) {
        this.rect(260 + i * 36, 82 - i % 2 * 13, 28, 164, '#453449');
        this.rect(265 + i * 36, 110, 6, 14, '#e1ac76');
      } else {
        this.rect(i * 108 + 15, 155, 12, 90, '#354747');
        for (let j = 0; j < 4; j++) this.rect(i * 108 - 8 + j * 4, 111 + j * 12, 58 - j * 7, 16, '#35605a');
      }
    }
    this.rect(0, 246, 480, 74, '#172d32');
    this.rect(0, 246, 480, 5, '#54836c');
    for (let i = 0; i < 40; i++) this.rect(i * 37 % 480, 260 + i * 19 % 48, 12, 2, '#254449');
  }

  draw(time: number, combat: Combat) {
    const c = this.ctx, stage = combat.stage;
    const theme=worldTheme(this.world.id),themeId=theme?this.world.id as ThemeWorld:undefined;
    const placement=sceneActors(this.world.id,stage),feet=placement.enemy.y,heroFeet=placement.hero.y;
    if (this.lastStage !== stage) { this.lastStage = stage; this.levelAt = time; }
    this.flights = this.flights.filter(f => time - f.time < .6 && f.target === stage);
    this.impacts = this.impacts.filter(f => time - f.at < (f.defeated?2.2:FEEDBACK[f.kind].duration) && (f.target === stage||f.defeated));
    const last = this.impacts.filter(f=>f.target===stage).at(-1);
    const hurtAge = last ? time - last.at : 10;
    const profile=FEEDBACK[last?.kind??'normal'];
    const hit = hurtAge >= 0 && hurtAge < profile.recovery;
    const encore=this.encore&&time>=this.encore.time&&time-this.encore.time<1.05?this.encore:undefined;
    const latestCast = encore&&time-encore.time<.44?encore:this.flights.at(-1);
    const castAge = latestCast ? time - latestCast.time : 10;
    const casting = castAge >= 0 && castAge < .36;
    const recoil = hit && !this.reduced ? Math.round(Math.sin(hurtAge/profile.recovery*Math.PI)*profile.kick) : 0;
    const hx = placement.hero.x, ex = placement.enemy.x + recoil;
    c.imageSmoothingEnabled = false;
    c.save();
    if(hit&&profile.shake&&!this.reduced)c.translate(Math.round(Math.sin(hurtAge*83)*profile.shake*(1-hurtAge/profile.recovery)),0);
    this.backdrop(stage);

    for (let i = 0; i < 22; i++) {
      const t = this.reduced ? 0 : time;
      const x = (i * 79 + t * (i % 2 ? 2 : -2) + 480) % 480;
      const y = 76 + i * 31 % 140 + Math.sin(t + i) * 5;
      c.globalAlpha = .35 + Math.sin(t * 1.5 + i) * .2;
      this.rect(x, y, i % 3 === 0 ? 2 : 1, 2, i % 2 ? '#ffdf82' : '#b8ffd7');
    }
    c.globalAlpha = 1;
    c.globalAlpha=.24;
    this.rect(hx - 25, placement.groundY, 50, 2, '#14101d');
    if (combat.hp > 0) this.rect(ex - 30, placement.groundY, 60, 2, '#14101d');
    c.globalAlpha=1;
    if(this.holding){
      this.fx.draw(c,theme?.rune??(this.world.id==='past'?'theater-rune':'hold-loop'),time-this.holdAt,hx,placement.groundY,.9,this.reduced,.85);
      if(this.world.id==='past')this.theater.charge(c,time,{x:hx,y:heroFeet},this.reduced);
      if(themeId)this.themed.charge(c,themeId,time,{x:hx,y:heroFeet},this.reduced);
    }

    const selected=this.actors.get(this.world.id);
    const actors=selected?.naturalWidth?selected:[...this.actors.values()].find(image=>image.naturalWidth);
    const theaterHero=this.world.id==='past'&&this.theater.hero(c,time,latestCast,this.holding,{x:hx,y:heroFeet},this.reduced);
    const themedHero=themeId&&this.themed.hero(c,themeId,time,latestCast,this.holding,{x:hx,y:heroFeet},this.reduced);
    if(!theaterHero&&!themedHero&&actors)this.sprite(actors,heroFrame(this.holding ? .12 : castAge,time,this.reduced),4,hx+(casting?2:0),heroFeet,128);
    if (combat.hp > 0) {
      if(actors)this.sprite(actors,enemyFrame(stage,hit),4,ex,feet,stage===3?160:128);
      c.globalAlpha = 1;
    } else {
      if(actors&&last?.defeated&&hurtAge<.2){c.globalAlpha=Math.max(0,1-hurtAge/.2);this.sprite(actors,enemyFrame(stage,true),4,ex,feet,stage===3?160:128);c.globalAlpha=1;}
      if(hurtAge>.3)this.note(ex-9,feet-38+(this.reduced?0:Math.sin(time*3)*3),'#ffe291',2);
    }

    for (const flight of this.flights) {
      if(this.world.id==='past'){this.theater.flight(c,time,flight,{x:hx,y:heroFeet},placement.enemy,this.reduced);continue;}
      if(themeId){this.themed.flight(c,themeId,time,flight,{x:hx,y:heroFeet},placement.enemy,this.reduced);continue;}
      const age = time - flight.time;
      if (age < ACTOR_WINDUP_SECONDS || age >= FLIGHT_SECONDS) continue;
      const p = (age-ACTOR_WINDUP_SECONDS)/(FLIGHT_SECONDS-ACTOR_WINDUP_SECONDS);
      const fromX=hx+42,toX=placement.enemy.x-12;
      const x=fromX+p*(toX-fromX),y=heroFeet-56+p*(feet-48-(heroFeet-56))-Math.sin(p*Math.PI)*24;
      for (let i = 1; i < 5; i++) {
        c.globalAlpha = (1 - i / 5) * .5;
        this.rect(x - i * 7, y + i % 2 * 3, 4, 3, '#fff2a1');
      }
      c.globalAlpha = 1;
      this.note(x, y, flight.skill ? '#ffe087' : '#e0ffd4', flight.skill ? 2 : 1);
      if (flight.skill) { this.note(x - 9, y + 17, '#ffb2c6', 1); this.note(x + 8, y - 15, '#b8d6ff', 1); }
    }

    for (const impact of this.impacts) {
      const age = time - impact.at;
      if (age < 0) continue;
      const target=sceneActors(this.world.id,impact.target).enemy;
      const impactX=impact.target===stage?ex:target.x,impactFeet=target.y;
      const tier=FEEDBACK[impact.kind];
      const scale=impact.kind==='boss'?1.8:impact.kind==='combo'?1:impact.kind==='normal'?.75:.85;
      const offset=tier.centerOffset;
      const effect=theme?.fx[impact.kind]??(this.world.id==='past'?THEATER_FX[impact.kind]:tier.asset as EffectId);
      this.fx.draw(c,effect,age+(impact.kind==='combo'?.22:0),impactX,impactFeet-48+offset*scale,scale,this.reduced);
      if(impact.hold&&impact.kind==='combo')this.fx.draw(c,theme?.fx.hold??'theater-hold',age,impactX,impactFeet-48,.85,this.reduced);
      if(this.world.id==='past')this.theater.impact(c,age,impact,{x:impactX,y:impactFeet},this.reduced);
      if(themeId)this.themed.impact(c,themeId,age,impact,{x:impactX,y:impactFeet},this.reduced);
      if(impact.defeated&&impact.kind!=='boss')this.fx.draw(c,'boss',age,impactX,impactFeet-30,1,this.reduced);
      if (impact.kind==='combo'&&!theme) {
        if (age < .5) {
          c.globalAlpha = 1 - age * 2;
          for (let j = 0; j < 5; j++) this.rect(impactX - 48, impactFeet - 70 + j * 8, 96, 1, '#ffdf99');
          c.globalAlpha = 1;
        }
      }
      if (age < .85) {
        c.globalAlpha = Math.min(1, (.85 - age) * 4);
        c.font = `bold ${impact.kind==='normal'?13:19}px monospace`;
        c.textAlign = 'center';
        c.lineWidth = 3;
        c.strokeStyle = '#23322e';
        const y = impactFeet - 98 - (this.reduced ? 0 : age * 24);
        c.strokeText(String(impact.damage), impactX, y);
        c.fillStyle = theme?(impact.kind==='combo'?theme.secondary:theme.primary):tier.color;
        c.fillText(String(impact.damage), impactX, y);
        c.globalAlpha = 1;
      }
    }
    if(encore){
      const age=time-encore.time,anchor={x:240,y:placement.groundY-15};
      if(themeId)this.themed.impact(c,themeId,age,encore,anchor,this.reduced,combat.won?112:76);
      else this.theater.impact(c,age,encore,anchor,this.reduced,combat.won?112:82);
    }
    if (!this.reduced) this.effect(this.levelUp, this.levelFrames, time - this.levelAt, hx - 55, heroFeet - 130, 110, 118);
    if (combat.won) {
      const age=this.bossAt===undefined?10:time-this.bossAt;
      if(age>=0&&age<2.2)this.fx.draw(c,theme?.fx.combo??(this.world.id==='past'?'theater-combo':'combo'),age+.22,240,190,1.1,this.reduced,.7);
      this.rect(110,38,260,52,'#16141eeb');
      this.rect(110,38,260,2,theme?.primary??'#ffe09b');
      c.textAlign='center';c.fillStyle=theme?.primary??'#ffe09b';c.font='12px monospace';
      c.fillText('HARMONY RESTORED',240,57);
      c.fillStyle='#fff8e7';c.font='18px NeoPixel, monospace';
      c.fillText('마지막 화음! 보스 처치',240,80);
    }
    c.restore();
  }
}
