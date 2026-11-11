import { ACTOR_WINDUP_SECONDS, enemyFrame, heroFrame } from './actors';
import { drawNoteBar } from './noteBar';
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
const LEAD = .7, IMPACT = .31;

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
    const trackW = Math.min(354, Math.round(w * (w < 540 ? .48 : .33)));
    const laneW = Math.floor(trackW / 5), left = Math.round((w - laneW * 5) / 2);
    const top = Math.round(h * (h < 460 ? .38 : .32)), bottom = Math.round(h * .72);
    const railHeight = bottom - top, barH = h < 460 ? 7 : 11;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.clearRect(0, 0, w, h);
    this.pose(this.hero, heroFrame(age, time, time < 0));
    this.pose(this.enemy, enemyFrame(0, age >= IMPACT && age < IMPACT + .18));

    for (let lane = 0; lane < 5; lane++) {
      const x = left + lane * laneW, active = recent?.lane === lane && age < .22;
      c.fillStyle = lane % 2 ? '#161527c9' : '#1d192ec9';
      c.fillRect(x, top, laneW - 1, railHeight);
      if (active) {
        c.fillStyle = COLORS[lane]; c.globalAlpha = .3 * (1 - age / .22);
        c.fillRect(x, top, laneW - 1, railHeight); c.globalAlpha = 1;
      }
      c.fillStyle = COLORS[lane]; c.fillRect(x, bottom + 4, laneW - 1, 3);
    }
    for (let y = 1; y < 4; y++) {
      c.fillStyle = '#fff1e229'; c.fillRect(left, Math.round(top + railHeight * y / 4), laneW * 5, 1);
    }
    c.save();
    c.beginPath(); c.rect(left, top, laneW * 5, railHeight + 1); c.clip();
    for (const [i, event] of events.entries()) {
      const progress = time < 0 ? (i < 4 ? .2 + i * .17 : -1) : 1 - (event.at - time) / LEAD;
      if (progress < 0 || progress >= 1) continue;
      drawNoteBar(c, { x: left + event.lane * laneW + 5, y: Math.round(top + progress * railHeight) - barH,
        width: laneW - 11, height: barH }, COLORS[event.lane], {});
    }
    c.restore();
    c.fillStyle = '#fff0d8'; c.fillRect(left, bottom - 1, laneW * 5, 2);
    if (recent && age < .18) {
      const x = left + (recent.lane + .5) * laneW;
      for (let i = -2; i <= 2; i++) {
        c.globalAlpha = 1 - age / .18;
        c.fillStyle = i % 2 ? COLORS[recent.lane] : '#fff6dd';
        c.fillRect(Math.round(x + i * (3 + age * 40)), Math.round(bottom - (3 - Math.abs(i)) * age * 65), 3, 3);
      }
      c.globalAlpha = 1;
    }

    if (age >= ACTOR_WINDUP_SECONDS && age < IMPACT) {
      const p = (age - ACTOR_WINDUP_SECONDS) / (IMPACT - ACTOR_WINDUP_SECONDS), dx = enemy.x - hero.x;
      const lift = Math.min(h * .115, 92);
      for (let i = 5; i >= 0; i--) {
        const q = Math.max(0, p - i * .055), x = hero.x + dx * q;
        const arc = Math.sin(q * Math.PI);
        const curve = this.world === 'future' ? 0 : this.world === 'fantasy' ? arc * Math.cos(q * Math.PI * 3) * .38
          : this.world === 'present' ? arc * .22 : arc * .55;
        const y = hero.y - lift + (enemy.y - hero.y) * q - curve * lift;
        c.fillStyle = i % 2 ? shadow : light;
        c.globalAlpha = 1 - i * .15;
        const size = i ? 4 : 9;
        c.fillRect(Math.round(x - size / 2), Math.round(y), size, size);
        if (!i) c.fillRect(Math.round(x + 2), Math.round(y - 14), 3, 17);
      }
    } else if (age >= IMPACT && age < IMPACT + .3) {
      const p = (age - IMPACT) / .3, y = enemy.y - Math.min(h * .115, 92);
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
