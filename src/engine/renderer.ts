import { HOLD_NOTE_MIN_BEATS, type RuntimeNote, type Song, type SongSection } from "../types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  glyph: "spark" | "note";
}

interface LaneMetric {
  left: number;
  right: number;
  center: number;
  width: number;
}

interface NoteHitArea {
  id: string;
  lane: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
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

const laneColors = ["#58d7d0", "#f177a2", "#f5c95e", "#82d477", "#89aaff"];
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export class StageRenderer {
  private context: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private density = 1;
  private song: Song;
  private background = new Image();
  private particles: Particle[] = [];
  private laneMetrics: LaneMetric[] = [];
  private noteHitAreas: NoteHitArea[] = [];
  private stageTop = 82;
  private stageBottom = 520;
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
    this.makeFallbackMetrics();
  }

  setStageLayout(hud: HTMLElement): void {
    const canvasRect = this.canvas.getBoundingClientRect();
    const hudRect = hud.getBoundingClientRect();
    this.stageTop = clamp(hudRect.bottom - canvasRect.top + 6, 54, this.height * 0.24);
    this.stageBottom = this.height - clamp(this.height * 0.035, 18, 34);
    this.makeLaneMetrics();
  }

  setSong(song: Song): void {
    this.song = song;
    this.background = new Image();
    this.background.decoding = "async";
    this.background.src = song.artwork;
  }

  hitTest(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const area = [...this.noteHitAreas].reverse().find((item) => (
      x >= item.left - 8 && x <= item.right + 8 && y >= item.top - 10 && y <= item.bottom + 10
    ));
    return area?.id ?? null;
  }

  pop(noteId: string, lane: number): void {
    const area = this.noteHitAreas.find((item) => item.id === noteId);
    const metric = this.laneMetrics[lane];
    if (!area && !metric) return;
    const originX = area?.centerX ?? metric?.center ?? this.width / 2;
    const originY = area?.centerY ?? this.stageBottom - 40;
    const count = this.reducedMotion ? 8 : 26;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 230;
      this.particles.push({
        x: originX + (Math.random() - 0.5) * 24,
        y: originY + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.55 + Math.random() * 0.4,
        size: 3 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
        color: laneColors[lane],
        glyph: index % 7 === 0 ? "note" : "spark",
      });
    }
  }

  clearEffects(): void {
    this.particles = [];
    this.noteHitAreas = [];
  }

  render(state: RenderState): void {
    const now = performance.now();
    const delta = Math.min(0.033, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.drawBackdrop(state);
    this.drawBoard(state);
    this.drawNotes(state);
    this.drawParticles(delta);
    if (state.paused) this.drawPause();
  }

  private makeFallbackMetrics(): void {
    this.makeLaneMetrics();
    this.stageBottom = this.height - clamp(this.height * 0.035, 18, 34);
  }

  private makeLaneMetrics(): void {
    const gutter = clamp(this.width * 0.018, 10, 24);
    const gap = clamp(this.width * 0.004, 4, 8);
    const laneWidth = (this.width - gutter * 2 - gap * 4) / 5;
    this.laneMetrics = Array.from({ length: 5 }, (_, lane) => {
      const left = gutter + lane * (laneWidth + gap);
      return { left, right: left + laneWidth, center: left + laneWidth / 2, width: laneWidth };
    });
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
      const drift = this.reducedMotion ? 0 : Math.sin(state.songTime * 0.12) * this.width * 0.006;
      ctx.drawImage(this.background, (this.width - drawWidth) / 2 + drift, (this.height - drawHeight) / 2, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = palette.deep;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const wash = ctx.createLinearGradient(0, 0, 0, this.height);
    wash.addColorStop(0, "rgba(4, 15, 20, .18)");
    wash.addColorStop(0.58, "rgba(4, 15, 20, .34)");
    wash.addColorStop(1, "rgba(3, 11, 15, .76)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = palette.accent;
    const beat = state.songTime * this.song.bpm / 60;
    for (let index = 0; index < 24; index += 1) {
      const x = ((index * 149) % 997) / 997 * this.width;
      const y = 30 + (((index * 83) % 431) / 431) * Math.max(40, this.stageBottom - 80);
      const twinkle = 0.35 + Math.sin(beat * 1.6 + index * 1.7) * 0.3;
      ctx.globalAlpha = Math.max(0.06, twinkle);
      ctx.fillRect(x, y, index % 5 === 0 ? 3 : 1.5, index % 5 === 0 ? 3 : 1.5);
    }
    ctx.restore();
  }

  private drawBoard(state: RenderState): void {
    const ctx = this.context;
    const top = this.stageTop;
    const bottom = this.stageBottom;
    const left = this.laneMetrics[0]?.left ?? 12;
    const right = this.laneMetrics[4]?.right ?? this.width - 12;

    ctx.save();
    ctx.fillStyle = "rgba(3, 16, 21, .7)";
    ctx.fillRect(left, top, right - left, bottom - top);

    this.laneMetrics.forEach((lane, index) => {
      const pulse = state.lanePulse[index] ?? 0;
      ctx.fillStyle = this.alpha(laneColors[index], 0.035 + pulse * 0.17);
      ctx.fillRect(lane.left, top, lane.width, bottom - top);
      ctx.strokeStyle = this.alpha(laneColors[index], 0.22 + pulse * 0.4);
      ctx.lineWidth = 1;
      ctx.strokeRect(lane.left + 0.5, top + 0.5, lane.width - 1, bottom - top - 1);

      const centerGlow = ctx.createLinearGradient(lane.left, 0, lane.right, 0);
      centerGlow.addColorStop(0, "rgba(255,255,255,0)");
      centerGlow.addColorStop(0.5, this.alpha(laneColors[index], 0.04 + pulse * 0.11));
      centerGlow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(lane.left, top, lane.width, bottom - top);
    });

    const secondsPerBeat = 60 / this.song.bpm;
    const approachSeconds = this.song.approachSeconds ?? 3.7;
    const currentBeat = state.songTime / secondsPerBeat;
    const visibleBeats = approachSeconds / secondsPerBeat;
    const firstBeat = Math.floor(currentBeat) - 1;
    const lastBeat = Math.ceil(currentBeat + visibleBeats) + 1;
    for (let beat = firstBeat; beat <= lastBeat; beat += 1) {
      const until = beat * secondsPerBeat - state.songTime;
      const y = bottom - (until / approachSeconds) * (bottom - top);
      if (y < top || y > bottom) continue;
      const isBar = ((beat % this.song.beatsPerBar) + this.song.beatsPerBar) % this.song.beatsPerBar === 0;
      ctx.strokeStyle = isBar ? "rgba(255,255,255,.36)" : "rgba(255,255,255,.105)";
      ctx.lineWidth = isBar ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(left, Math.round(y) + 0.5);
      ctx.lineTo(right, Math.round(y) + 0.5);
      ctx.stroke();
      if (isBar && y > top + 18 && y < bottom - 20) {
        ctx.fillStyle = "rgba(255,255,255,.46)";
        ctx.font = "700 10px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(String(Math.max(1, Math.floor(beat / this.song.beatsPerBar) + 1)).padStart(2, "0"), left + 8, y - 5);
      }
    }

    const fade = ctx.createLinearGradient(0, bottom - 80, 0, bottom);
    fade.addColorStop(0, "rgba(3,16,21,0)");
    fade.addColorStop(1, "rgba(3,16,21,.82)");
    ctx.fillStyle = fade;
    ctx.fillRect(left, bottom - 80, right - left, 80);

    if (state.section.mode === "listen") {
      ctx.fillStyle = this.alpha(this.song.palette.accent, state.focusHint ? 0.075 : 0.04);
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    ctx.restore();
  }

  private drawNotes(state: RenderState): void {
    const secondsPerBeat = 60 / this.song.bpm;
    const approachSeconds = this.song.approachSeconds ?? 3.7;
    const travel = this.stageBottom - this.stageTop;
    this.noteHitAreas = [];
    state.notes.forEach((note) => {
      if (note.missed || (note.hit && note.completed)) return;
      const metric = this.laneMetrics[note.lane];
      if (!metric) return;
      const noteTime = note.beat * secondsPerBeat;
      const until = noteTime - state.songTime;
      if (until > approachSeconds + 0.08 || until < -0.3) return;

      const headY = this.stageBottom - (until / approachSeconds) * travel;
      const width = Math.min(metric.width - 12, clamp(metric.width * 0.78, 62, 210));
      const height = clamp(metric.width * 0.14, 24, 38);
      const opacity = clamp((approachSeconds - until) / 0.24, 0.24, 1);
      const isHold = note.durationBeats >= HOLD_NOTE_MIN_BEATS;
      let areaTop = headY - height / 2;
      let areaBottom = headY + height / 2;

      if (isHold) {
        const endTime = noteTime + note.durationBeats * secondsPerBeat;
        const endUntil = endTime - state.songTime;
        const endY = clamp(this.stageBottom - (endUntil / approachSeconds) * travel, this.stageTop, this.stageBottom);
        this.drawHoldRibbon(metric.center, endY, headY, width * 0.62, note.lane, opacity, note.holding);
        if (note.holding) {
          this.drawHoldProgress(metric.center, endY, headY, width * 0.54, note.lane, note.holdProgress);
        }
        this.drawNoteBar(metric.center, endY, width * 0.86, Math.max(10, height * 0.68), note.lane, false, opacity * 0.72);
        areaTop = Math.min(areaTop, endY - height * 0.36);
        areaBottom = Math.max(areaBottom, endY + height * 0.36);
      }

      this.drawNoteBar(metric.center, headY, width, height, note.lane, Boolean(note.accent) || note.holding, opacity);
      this.noteHitAreas.push({
        id: note.id,
        lane: note.lane,
        left: metric.center - width / 2,
        right: metric.center + width / 2,
        top: clamp(areaTop, this.stageTop, this.stageBottom),
        bottom: clamp(areaBottom, this.stageTop, this.stageBottom),
        centerX: metric.center,
        centerY: clamp((areaTop + areaBottom) / 2, this.stageTop, this.stageBottom),
      });
    });
  }

  private drawHoldRibbon(x: number, top: number, bottom: number, width: number, lane: number, opacity: number, holding: boolean): void {
    const ctx = this.context;
    if (bottom - top < 3) return;
    const ribbon = ctx.createLinearGradient(0, top, 0, bottom);
    ribbon.addColorStop(0, this.alpha(laneColors[lane], 0.16 * opacity));
    ribbon.addColorStop(1, this.alpha(laneColors[lane], 0.58 * opacity));
    ctx.save();
    ctx.shadowBlur = holding ? 18 : 10;
    ctx.shadowColor = laneColors[lane];
    ctx.fillStyle = ribbon;
    ctx.strokeStyle = this.alpha(laneColors[lane], 0.72 * opacity);
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x - width / 2, top, width, bottom - top, Math.min(7, width * 0.08));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawHoldProgress(x: number, top: number, bottom: number, width: number, lane: number, progress: number): void {
    const ctx = this.context;
    const height = bottom - top;
    if (height < 3) return;
    const amount = clamp(progress, 0, 1);
    const fillTop = bottom - height * amount;
    const fillHeight = Math.max(3, bottom - fillTop);
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = laneColors[lane];
    ctx.fillStyle = this.alpha("#ffffff", 0.28 + amount * 0.2);
    this.roundRect(ctx, x - width / 2, fillTop, width, fillHeight, Math.min(6, width * 0.08));
    ctx.fill();
    ctx.strokeStyle = this.alpha("#ffffff", 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - width * 0.42, fillTop);
    ctx.lineTo(x + width * 0.42, fillTop);
    ctx.stroke();
    ctx.restore();
  }

  private drawNoteBar(x: number, y: number, width: number, height: number, lane: number, accent: boolean, opacity: number): void {
    const ctx = this.context;
    const color = laneColors[lane];
    const radius = Math.min(7, height * 0.34);
    const face = ctx.createLinearGradient(0, y - height / 2, 0, y + height / 2);
    face.addColorStop(0, this.alpha("#ffffff", opacity * 0.96));
    face.addColorStop(0.24, this.alpha(color, opacity));
    face.addColorStop(1, this.alpha(color, opacity * 0.75));
    ctx.save();
    ctx.shadowBlur = accent ? 20 : 13;
    ctx.shadowColor = color;
    ctx.fillStyle = face;
    ctx.strokeStyle = this.alpha("#ffffff", opacity * 0.92);
    ctx.lineWidth = accent ? 2.5 : 1.7;
    this.roundRect(ctx, x - width / 2, y - height / 2, width, height, radius);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.alpha("#ffffff", opacity * 0.48);
    this.roundRect(ctx, x - width * 0.39, y - height * 0.27, width * 0.78, Math.max(2, height * 0.15), radius * 0.5);
    ctx.fill();
    if (accent) {
      ctx.fillStyle = this.song.palette.accent;
      this.roundRect(ctx, x - 3, y - height * 0.34, 6, height * 0.68, 2);
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
      particle.vy += 180 * delta;
      particle.rotation += particle.spin * delta;
      const alpha = clamp(particle.life * 1.8, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      if (particle.glyph === "note") {
        ctx.font = `800 ${Math.round(particle.size * 3)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♪", 0, 0);
      } else {
        const size = particle.size * clamp(particle.life * 1.7, 0.3, 1);
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.3, -size * 0.3);
        ctx.lineTo(size, 0);
        ctx.lineTo(size * 0.3, size * 0.3);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.3, size * 0.3);
        ctx.lineTo(-size, 0);
        ctx.lineTo(-size * 0.3, -size * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return true;
    });
  }

  private drawPause(): void {
    const ctx = this.context;
    ctx.fillStyle = "rgba(4, 14, 17, .72)";
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

  private alpha(hex: string, alpha: number): string {
    const value = hex.replace("#", "");
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
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
