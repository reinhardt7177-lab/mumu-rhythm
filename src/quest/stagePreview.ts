import { ACTOR_WINDUP_SECONDS, enemyFrame, heroFrame } from './actors';
import type { Point } from './sceneLayout';

const COLORS = ['#81e6d0', '#ff92ad', '#ffe39a', '#b8e491', '#b7b5ff'];
const PHRASES: Record<string, readonly number[]> = {
  past: [1, 3, 2, 4, 2, 0], present: [0, 2, 3, 4, 2, 1],
  future: [4, 0, 3, 1, 4, 2], fantasy: [2, 0, 1, 3, 4, 2],
};
const PALETTES: Record<string, readonly [string, string]> = {
  past: ['#ffda83', '#ff967f'], present: ['#ffc081', '#ff83b0'],
  future: ['#a4edff', '#cba6ff'], fantasy: ['#e9ffad', '#d9a9fa'],
};
const LEAD = .7, IMPACT = .38;

export function previewBeats(world: string, bpm: number) {
  const interval = Math.max(.43, Math.min(.63, 60 / bpm));
  return (PHRASES[world] ?? PHRASES.past).map((lane, index) => ({ lane, at: LEAD + index * interval }));
}

interface StageLayout { hero: Point; enemy: Point }

export class StagePreview {
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly ctx: CanvasRenderingContext2D;
  private frame = 0;
  private layout?: StageLayout;
  private world = 'past';
  private bpm = 120;
  private width = 0;
  private height = 0;
  private scale = 1;

  constructor(private canvas: HTMLCanvasElement, private hero: HTMLElement, private enemy: HTMLElement, private replay: HTMLButtonElement) {
    this.ctx = canvas.getContext('2d')!;
    replay.addEventListener('click', () => this.play(this.world, this.bpm));
    this.motion.addEventListener('change', () => this.stop());
  }

  resize(width: number, height: number, layout: StageLayout) {
    this.width = width; this.height = height; this.layout = layout;
    this.scale = Math.min(1, 640 / width, 400 / height);
    this.canvas.width = Math.max(1, Math.round(width * this.scale));
    this.canvas.height = Math.max(1, Math.round(height * this.scale));
    if (!this.frame) this.draw(-1);
  }

  play(world: string, bpm: number) {
    this.stop();
    this.world = world; this.bpm = bpm;
    this.draw(-1);
    if (this.motion.matches || document.hidden) return;
    const start = performance.now();
    const end = previewBeats(world, bpm).at(-1)!.at + .68;
    let previous = -Infinity;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (t >= end || document.hidden || !this.canvas.getClientRects().length || document.querySelector('dialog[open]')) {
        this.stop(); return;
      }
      if (now - previous >= 30) { this.draw(t); previous = now; }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stop() {
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.replay.hidden = this.motion.matches;
    this.draw(-1);
  }

  private pose(element: HTMLElement, frame: number) {
    element.style.backgroundPosition = `${frame % 4 * 100 / 3}% ${Math.floor(frame / 4) * 50}%`;
  }

  private draw(time: number) {
    if (!this.layout) return;
    const c = this.ctx, w = this.width, h = this.height;
    const { hero, enemy } = this.layout;
    const events = previewBeats(this.world, this.bpm);
    const hits = time < 0 ? [] : events.filter(event => time >= event.at);
    const recent = hits.at(-1), age = recent ? time - recent.at : Infinity;
    const [light, shadow] = PALETTES[this.world] ?? PALETTES.past;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.clearRect(0, 0, w, h);
    this.pose(this.hero, heroFrame(age, time, time < 0));
    this.pose(this.enemy, enemyFrame(0, age >= IMPACT && age < IMPACT + .18));

    const lift = Math.min(h * .17, 105), arcHeight = Math.min(h * .10, 55);
    const point = (p: number, lane: number) => {
      const arc = Math.sin(p * Math.PI);
      const curve = this.world === 'future' ? 0 : this.world === 'fantasy' ? arc * Math.cos(p * Math.PI) : arc;
      return {x:hero.x+(enemy.x-hero.x)*p,y:hero.y-lift+(enemy.y-hero.y)*p-curve*arcHeight-(lane-2)*arc*5};
    };
    const drawNote = ({x,y}: Point, size: number, color: string, alpha: number) => {
      x=Math.round(x);y=Math.round(y);c.globalAlpha=alpha;c.fillStyle='#19243a';
      c.fillRect(x-size-1,y-size+1,2*size+1,size+2);c.fillRect(x-1,y-4*size-1,size+2,4*size+2);
      c.fillStyle=color;
      c.fillRect(x-size,y-size,2*size,size);c.fillRect(x,y-4*size,size,4*size);
      c.fillRect(x+size,y-4*size,size*2,size);c.fillRect(x+size*2,y-3*size,size,size);
    };
    if(time<0){
      [.34,.50,.66].forEach((p,i)=>drawNote(point(p,i+1),w<540?3:5,i===1?'#fff6db':light,.86));
    }
    if (age >= ACTOR_WINDUP_SECONDS && age < IMPACT) {
      const p = (age - ACTOR_WINDUP_SECONDS) / (IMPACT - ACTOR_WINDUP_SECONDS);
      for (let i = 4; i > 0; i--) {
        const q = p-i*.085;
        if(q<0)continue;
        const {x,y}=point(q,recent!.lane);
        c.fillStyle=i%2?COLORS[recent!.lane]:light;c.globalAlpha=1-i*.17;
        c.fillRect(Math.round(x),Math.round(y),i<3?5:3,i<3?5:3);
      }
      drawNote(point(p,recent!.lane),w<540?4:6,'#fff6db',1);
    } else if (age >= IMPACT && age < IMPACT + .3) {
      const p = (age - IMPACT) / .3, y = enemy.y - lift;
      const finale = hits.length === events.length;
      c.globalAlpha = 1 - p;
      const count = finale ? 12 : 8;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count, r = 9 + p * (finale ? 58 : 42);
        c.fillStyle = i % 2 ? light : shadow;
        c.fillRect(Math.round(enemy.x + Math.cos(angle) * r), Math.round(y + Math.sin(angle) * r), 5, 5);
      }
    }
    c.globalAlpha = 1;
  }
}
