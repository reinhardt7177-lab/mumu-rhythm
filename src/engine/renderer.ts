import type { RuntimeNote, Song, SongSection } from "../types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

export interface RenderState {
  songTime: number;
  notes: RuntimeNote[];
  section: SongSection;
  lanePulse: number[];
  progress: number;
  paused: boolean;
  focusHint: boolean;
}

const laneColors = ["#62d8d2", "#ef739a", "#f5c75b", "#7dcf72", "#8aa8ff"];
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

export class StageRenderer {
  private context: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private density = 1;
  private song: Song;
  private background = new Image();
  private particles: Particle[] = [];
  private lastFrame = performance.now();
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private canvas: HTMLCanvasElement, song: Song) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D를 시작할 수 없습니다.");
    this.context = context;
    this.song = song;
    this.setSong(song);
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.density = Math.min(2, window.devicePixelRatio || 1);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.width * this.density);
    this.canvas.height = Math.floor(this.height * this.density);
    this.context.setTransform(this.density, 0, 0, this.density, 0, 0);
  }

  setSong(song: Song): void {
    this.song = song;
    this.background = new Image();
    this.background.decoding = "async";
    this.background.src = song.artwork;
  }

  hit(lane: number, strength: number): void {
    const x = this.laneX(lane, 1);
    const y = this.judgeY();
    const count = this.reducedMotion ? 5 : Math.round(8 + strength * 8);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * (1.12 + Math.random() * 0.76);
      const speed = 55 + Math.random() * 135;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.35,
        size: 2 + Math.random() * 5,
        color: laneColors[lane],
      });
    }
  }

  clearEffects(): void {
    this.particles = [];
  }

  render(state: RenderState): void {
    const now = performance.now();
    const delta = Math.min(0.033, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.drawBackdrop(state);
    this.drawStage(state);
    this.drawNotes(state);
    this.drawParticles(delta);
    if (state.paused) this.drawPause();
  }

  private drawBackdrop(state: RenderState): void {
    const ctx = this.context;
    const palette = this.song.palette;
    ctx.fillStyle = palette.deep;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.background.complete && this.background.naturalWidth > 0) {
      const scale = Math.max(this.width / this.background.naturalWidth, this.height / this.background.naturalHeight);
      const drawWidth = this.background.naturalWidth * scale;
      const drawHeight = this.background.naturalHeight * scale;
      const drift = this.reducedMotion ? 0 : Math.sin(state.songTime * 0.16) * this.width * 0.008;
      ctx.drawImage(this.background, (this.width - drawWidth) / 2 + drift, (this.height - drawHeight) / 2, drawWidth, drawHeight);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, this.height);
      sky.addColorStop(0, palette.deep);
      sky.addColorStop(0.65, palette.ink);
      sky.addColorStop(1, "#091619");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawFallbackScene(state.songTime);
    }

    const veil = ctx.createLinearGradient(0, 0, 0, this.height);
    veil.addColorStop(0, "rgba(5, 20, 24, .1)");
    veil.addColorStop(0.5, "rgba(5, 20, 24, .28)");
    veil.addColorStop(1, "rgba(4, 13, 16, .78)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawFallbackScene(time: number): void {
    const ctx = this.context;
    const pulse = 0.45 + Math.sin(time * 1.4) * 0.08;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = this.song.palette.accent;
    for (let index = 0; index < 28; index += 1) {
      const x = ((index * 127) % 997) / 997 * this.width;
      const y = 35 + (((index * 83) % 431) / 431) * this.height * 0.48;
      const size = index % 5 === 0 ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawStage(state: RenderState): void {
    const ctx = this.context;
    const horizon = this.horizonY();
    const judge = this.judgeY();
    const center = this.width / 2;
    const topHalf = Math.min(this.width * 0.17, 210);
    const bottomHalf = Math.min(this.width * 0.49, 610);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center - topHalf, horizon);
    ctx.lineTo(center + topHalf, horizon);
    ctx.lineTo(center + bottomHalf, this.height + 4);
    ctx.lineTo(center - bottomHalf, this.height + 4);
    ctx.closePath();
    const road = ctx.createLinearGradient(0, horizon, 0, this.height);
    road.addColorStop(0, "rgba(8, 30, 35, .48)");
    road.addColorStop(1, "rgba(3, 12, 14, .94)");
    ctx.fillStyle = road;
    ctx.fill();

    for (let edge = 0; edge <= 5; edge += 1) {
      const ratio = edge / 5;
      const topX = lerp(center - topHalf, center + topHalf, ratio);
      const bottomX = lerp(center - bottomHalf, center + bottomHalf, ratio);
      ctx.strokeStyle = edge === 0 || edge === 5 ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.19)";
      ctx.lineWidth = edge === 0 || edge === 5 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(topX, horizon);
      ctx.lineTo(bottomX, this.height);
      ctx.stroke();
    }

    const secondsPerBeat = 60 / this.song.bpm;
    const beat = state.songTime / secondsPerBeat;
    for (let line = 0; line < 10; line += 1) {
      const phase = ((line / 10 + beat / 10) % 1 + 1) % 1;
      const shaped = phase ** 1.8;
      const y = lerp(horizon, this.height, shaped);
      const halfWidth = lerp(topHalf, bottomHalf, shaped);
      ctx.strokeStyle = line % this.song.beatsPerBar === 0 ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.09)";
      ctx.lineWidth = line % this.song.beatsPerBar === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(center - halfWidth, y);
      ctx.lineTo(center + halfWidth, y);
      ctx.stroke();
    }

    const judgeGradient = ctx.createLinearGradient(center - bottomHalf, 0, center + bottomHalf, 0);
    laneColors.forEach((color, index) => judgeGradient.addColorStop(index / 4, color));
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.song.palette.accent;
    ctx.strokeStyle = judgeGradient;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(center - bottomHalf * 0.82, judge);
    ctx.lineTo(center + bottomHalf * 0.82, judge);
    ctx.stroke();
    ctx.shadowBlur = 0;

    state.lanePulse.forEach((amount, lane) => {
      if (amount <= 0.01) return;
      const x = this.laneX(lane, 1);
      const laneWidth = (bottomHalf * 2) / 5;
      ctx.fillStyle = this.alpha(laneColors[lane], amount * 0.2);
      ctx.fillRect(x - laneWidth * 0.42, judge - 18, laneWidth * 0.84, this.height - judge + 18);
    });

    if (state.section.mode === "listen") {
      const glow = ctx.createRadialGradient(center, horizon + 30, 0, center, horizon + 30, this.width * 0.38);
      glow.addColorStop(0, this.alpha(this.song.palette.accent, state.focusHint ? 0.24 : 0.13));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, this.width, this.height * 0.7);
    }
    ctx.restore();
  }

  private drawNotes(state: RenderState): void {
    const ctx = this.context;
    const approachSeconds = 3.35;
    const secondsPerBeat = 60 / this.song.bpm;

    state.notes.forEach((note) => {
      if (note.missed || (note.hit && note.completed)) return;
      const noteTime = note.beat * secondsPerBeat;
      const until = noteTime - state.songTime;
      const progress = 1 - until / approachSeconds;
      if (progress < -0.04 || progress > 1.14) return;
      const shaped = clamp(progress, 0, 1) ** 1.55;
      const x = this.laneX(note.lane, shaped);
      const y = lerp(this.horizonY(), this.judgeY(), shaped);
      const laneWidth = this.laneWidth(shaped);
      const barWidth = laneWidth * 0.8;
      const durationWeight = clamp(note.durationBeats, 0.5, 1.5);
      const barHeight = clamp(laneWidth * 0.14 * (0.78 + durationWeight * 0.16), 5, 22);
      const isHold = note.durationBeats >= 1.75;

      if (isHold) {
        const endTime = noteTime + note.durationBeats * secondsPerBeat;
        const endProgress = 1 - (endTime - state.songTime) / approachSeconds;
        const endShaped = clamp(endProgress, 0, 1) ** 1.55;
        const tailX = this.laneX(note.lane, endShaped);
        const tailY = lerp(this.horizonY(), this.judgeY(), endShaped);
        const headBodyWidth = laneWidth * 0.58;
        const tailBodyWidth = this.laneWidth(endShaped) * 0.58;
        const ribbon = ctx.createLinearGradient(tailX, tailY, x, y);
        ribbon.addColorStop(0, this.alpha(laneColors[note.lane], 0.24));
        ribbon.addColorStop(1, this.alpha(laneColors[note.lane], note.holding ? 0.76 : 0.56));

        ctx.save();
        ctx.shadowBlur = note.holding ? 18 : 10;
        ctx.shadowColor = laneColors[note.lane];
        ctx.fillStyle = ribbon;
        ctx.strokeStyle = this.alpha(laneColors[note.lane], 0.78);
        ctx.lineWidth = clamp(headBodyWidth * 0.035, 1, 3);
        ctx.beginPath();
        ctx.moveTo(tailX - tailBodyWidth / 2, tailY);
        ctx.lineTo(tailX + tailBodyWidth / 2, tailY);
        ctx.lineTo(x + headBodyWidth / 2, y);
        ctx.lineTo(x - headBodyWidth / 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        this.drawNoteBar(tailX, tailY, tailBodyWidth * 1.08, Math.max(4, barHeight * 0.56), note.lane, false, 0.68);
      }

      this.drawNoteBar(x, y, barWidth, barHeight, note.lane, Boolean(note.accent), note.holding ? 1 : 0.88);
    });
  }

  private drawNoteBar(
    x: number,
    y: number,
    width: number,
    height: number,
    lane: number,
    accent: boolean,
    opacity: number,
  ): void {
    const ctx = this.context;
    const color = laneColors[lane];
    const radius = Math.min(5, height * 0.28);
    const face = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    face.addColorStop(0, this.alpha("#ffffff", opacity * 0.94));
    face.addColorStop(0.28, this.alpha(color, opacity));
    face.addColorStop(1, this.alpha(color, opacity * 0.72));

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 13;
    ctx.shadowColor = color;
    ctx.fillStyle = face;
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = clamp(height * 0.1, 1, 2.5);
    this.roundRect(ctx, -width / 2, -height / 2, width, height, radius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.5)";
    this.roundRect(ctx, -width * 0.39, -height * 0.24, width * 0.78, Math.max(1, height * 0.16), radius * 0.45);
    ctx.fill();

    if (accent) {
      const accentWidth = Math.max(3, width * 0.08);
      ctx.fillStyle = this.song.palette.accent;
      this.roundRect(ctx, -accentWidth / 2, -height * 0.36, accentWidth, height * 0.72, 1.5);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(delta: number): void {
    const ctx = this.context;
    this.particles = this.particles.filter((particle) => {
      particle.life -= delta;
      if (particle.life <= 0) return false;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 210 * delta;
      ctx.globalAlpha = clamp(particle.life * 2, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * clamp(particle.life * 1.8, 0.2, 1), 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1;
  }

  private drawPause(): void {
    const ctx = this.context;
    ctx.fillStyle = "rgba(4, 14, 17, .62)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${clamp(this.width * 0.032, 24, 46)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("잠시 쉬는 중", this.width / 2, this.height / 2 - 12);
    ctx.font = `600 ${clamp(this.width * 0.014, 14, 20)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,.76)";
    ctx.fillText("계속하려면 ESC를 눌러요", this.width / 2, this.height / 2 + 30);
  }

  private laneX(lane: number, progress: number): number {
    const center = this.width / 2;
    const topHalf = Math.min(this.width * 0.17, 210);
    const bottomHalf = Math.min(this.width * 0.49, 610);
    const halfWidth = lerp(topHalf, bottomHalf, progress);
    const laneRatio = (lane + 0.5) / 5;
    return lerp(center - halfWidth, center + halfWidth, laneRatio);
  }

  private laneWidth(progress: number): number {
    const topHalf = Math.min(this.width * 0.17, 210);
    const bottomHalf = Math.min(this.width * 0.49, 610);
    return (lerp(topHalf, bottomHalf, progress) * 2) / 5;
  }

  private horizonY(): number {
    return this.height * 0.2;
  }

  private judgeY(): number {
    return this.height * 0.78;
  }

  private alpha(hex: string, alpha: number): string {
    const value = hex.replace("#", "");
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private roundRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }
}
