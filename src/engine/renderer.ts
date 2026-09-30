import { stageGeometry } from "../content/stageGeometry.generated";
import { computeLaneLayout, noteY, type LaneLayout } from "../render/stageLayout";
import { HOLD_NOTE_MIN_BEATS, type RuntimeNote, type Song, type SongSection } from "../types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  lane: number;
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

export const LANE_COLORS = ["#3fe0d8", "#ff5fa2", "#ffc94a", "#6fdc6a", "#6f9bff"] as const;
const LANE_KEYS = ["A", "S", "D", "J", "K"];
const STAGE_INK = "#06080e";
const SPRITE_PAD = 10;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function makeLayer(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D를 시작할 수 없습니다.");
  return { canvas, ctx };
}

/**
 * Canvas 2D owns the readable game layer: lanes, notes, beat lines, judgement
 * hit areas and a light particle fallback. Static layers and note bars are
 * cached as sprites so the per-frame cost does not depend on shadowBlur.
 */
export class StageRenderer {
  private context: CanvasRenderingContext2D;
  private layout: LaneLayout = computeLaneLayout(1, 1, 0);
  private density = 1;
  private song: Song;
  private particles: Particle[] = [];
  private noteHitAreas: NoteHitArea[] = [];
  private lastFrame = performance.now();
  private backLayer: HTMLCanvasElement | null = null;
  private laneLayer: HTMLCanvasElement | null = null;
  private noteSprites: HTMLCanvasElement[] = [];
  private accentSprites: HTMLCanvasElement[] = [];
  private tailSprites: HTMLCanvasElement[] = [];
  private ribbonSprites: HTMLCanvasElement[] = [];
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private particleScale = 1;
  private drawFallbackFx = true;
  /** Pooled hit areas: `hitAreaCount` entries are live for the current frame. */
  private hitAreaCount = 0;
  /** Notes are sorted by beat; everything before this index is already judged. */
  private firstVisible = 0;
  private cursorNotes: RuntimeNote[] | null = null;
  // Per-frame style strings are built once per layout/song instead of every frame.
  private rungStyles: string[] = [];
  private ringStyles: string[][] = [];
  private listenStyles: [string, string] = ["", ""];
  private barLabels: string[] = [];
  private layoutKey = "";

  constructor(private canvas: HTMLCanvasElement, song: Song) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D를 시작할 수 없습니다.");
    this.context = context;
    this.song = song;
  }

  get currentLayout(): LaneLayout {
    return this.layout;
  }

  /** Sizes the canvas to the integer 9:16 stage rect (CSS px) with a DPR cap. */
  setLayout(width: number, height: number, hudHeight: number, dprCap: number): void {
    const density = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
    const key = `${width}x${height}|${hudHeight}|${density}`;
    // Resize observers fire repeatedly with identical sizes; rebuilding sprites is the expensive part.
    if (key === this.layoutKey && this.backLayer) return;
    this.layoutKey = key;
    this.density = density;
    this.layout = computeLaneLayout(width, height, hudHeight);
    const pixelWidth = Math.max(1, Math.round(width * this.density));
    const pixelHeight = Math.max(1, Math.round(height * this.density));
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    this.context.setTransform(this.density, 0, 0, this.density, 0, 0);
    this.buildCaches();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  setParticleScale(value: number): void {
    this.particleScale = clamp(value, 0, 1);
  }

  /** Skia draws lane light, hold energy and debris when it is active. */
  setFallbackEffects(enabled: boolean): void {
    this.drawFallbackFx = enabled;
    if (!enabled) this.particles = [];
  }

  setSong(song: Song): void {
    this.song = song;
    this.cursorNotes = null;
    if (this.backLayer) this.buildCaches();
  }

  hitTest(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: NoteHitArea | null = null;
    let bestDistance = Infinity;
    for (let index = 0; index < this.hitAreaCount; index += 1) {
      const item = this.noteHitAreas[index];
      if (x < item.left - 8 || x > item.right + 8 || y < item.top - 12 || y > item.bottom + 12) continue;
      const distance = Math.abs(y - item.centerY);
      if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best?.id ?? null;
  }

  pop(noteId: string, lane: number): void {
    if (!this.drawFallbackFx) return;
    let area: NoteHitArea | undefined;
    for (let index = 0; index < this.hitAreaCount; index += 1) {
      if (this.noteHitAreas[index].id === noteId) area = this.noteHitAreas[index];
    }
    const metric = this.layout.lanes[lane];
    if (!metric) return;
    const originX = area?.centerX ?? metric.center;
    const originY = area?.centerY ?? this.layout.hitY;
    const count = Math.round((this.reducedMotion ? 6 : 16) * Math.max(0.3, this.particleScale));
    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI * Math.random();
      const speed = 60 + Math.random() * 200;
      this.particles.push({
        x: originX + (Math.random() - 0.5) * metric.width * 0.6,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.35,
        size: 2 + Math.random() * 3,
        lane,
      });
    }
  }

  clearEffects(): void {
    this.particles = [];
    this.hitAreaCount = 0;
    this.cursorNotes = null;
  }

  render(state: RenderState): void {
    const now = performance.now();
    const delta = Math.min(0.033, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const ctx = this.context;
    const { width, height } = this.layout;
    if (!this.backLayer || !this.laneLayer) this.buildCaches();

    ctx.drawImage(this.backLayer!, 0, 0, width, height);
    this.drawDepth(state);
    ctx.drawImage(this.laneLayer!, 0, 0, width, height);
    this.drawLaneLight(state);
    this.drawBeatLines(state);
    this.drawNotes(state);
    if (this.drawFallbackFx) this.drawParticles(delta);
    if (state.section.mode === "listen") {
      ctx.fillStyle = this.listenStyles[state.focusHint ? 0 : 1];
      ctx.fillRect(this.layout.left, this.layout.top, this.layout.right - this.layout.left, this.layout.bottom - this.layout.top);
    }
    if (state.paused) this.drawPause();
  }

  // ---------------------------------------------------------------- caches

  private buildCaches(): void {
    const { width, height } = this.layout;
    const scale = this.density;
    this.backLayer = this.buildBackLayer(width, height, scale);
    this.laneLayer = this.buildLaneLayer(width, height, scale);
    const noteW = this.layout.noteWidth;
    const noteH = this.layout.noteHeight;
    this.noteSprites = LANE_COLORS.map((color) => this.buildNoteSprite(noteW, noteH, color, false, scale));
    this.accentSprites = LANE_COLORS.map((color) => this.buildNoteSprite(noteW, noteH, color, true, scale));
    this.tailSprites = LANE_COLORS.map((color) => this.buildNoteSprite(noteW * 0.84, Math.max(8, noteH * 0.55), color, false, scale));
    this.ribbonSprites = LANE_COLORS.map((color) => this.buildRibbonSprite(color));
    const rungs = stageGeometry.stage.rungs;
    this.rungStyles = rungs.map((_, index) => `rgba(160, 190, 255, ${(0.05 + (1 - index / rungs.length) * 0.16).toFixed(3)})`);
    const rings = stageGeometry.stage.rings;
    this.ringStyles = rings.map((_, index) => LANE_COLORS.map((color) => rgba(color, 0.06 + (1 - index / rings.length) * 0.16)));
    this.listenStyles = [rgba(this.song.palette.accent, 0.05), rgba(this.song.palette.accent, 0.03)];
  }

  private buildBackLayer(width: number, height: number, scale: number): HTMLCanvasElement {
    const { canvas, ctx } = makeLayer(width * scale, height * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = STAGE_INK;
    ctx.fillRect(0, 0, width, height);
    const [hx, hy] = stageGeometry.stage.camera.horizon;
    const glow = ctx.createRadialGradient(hx * width, hy * height, 0, hx * width, hy * height, height * 0.7);
    glow.addColorStop(0, rgba(this.song.palette.accent, 0.16));
    glow.addColorStop(0.45, "rgba(30, 40, 80, 0.12)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Blender star layers, sized by projected depth.
    stageGeometry.stage.layers.forEach((layer, layerIndex) => {
      const points = layer.points;
      for (let index = 0; index + 2 < points.length; index += 3) {
        const size = points[index + 2] * (width / 540);
        ctx.fillStyle = rgba(LANE_COLORS[(index / 3 + layerIndex) % 5], 0.25 + layer.parallax * 0.45);
        ctx.fillRect(points[index] * width, points[index + 1] * height, size, size);
      }
    });

    // Blender floor rails converging on the camera horizon.
    ctx.lineWidth = 1;
    stageGeometry.stage.rails.forEach((rail, index) => {
      const gradient = ctx.createLinearGradient(0, rail.y1 * height, 0, rail.y0 * height);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(1, rgba(LANE_COLORS[Math.min(4, index)], 0.35));
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(rail.x1 * width, rail.y1 * height);
      ctx.lineTo(rail.x0 * width, rail.y0 * height);
      ctx.stroke();
    });
    return canvas;
  }

  private buildLaneLayer(width: number, height: number, scale: number): HTMLCanvasElement {
    const { canvas, ctx } = makeLayer(width * scale, height * scale);
    ctx.scale(scale, scale);
    const { top, bottom, hitY, left, right, lanes, zoneHeight } = this.layout;

    // Dark lane mask: lighter far away so Blender depth reads, dense near the beat line.
    const mask = ctx.createLinearGradient(0, top, 0, bottom);
    mask.addColorStop(0, "rgba(5, 7, 13, 0.62)");
    mask.addColorStop(0.55, "rgba(5, 7, 13, 0.8)");
    mask.addColorStop(1, "rgba(5, 7, 13, 0.94)");
    ctx.fillStyle = mask;
    ctx.fillRect(left, top, right - left, bottom - top);

    lanes.forEach((lane, index) => {
      const color = LANE_COLORS[index];
      ctx.fillStyle = rgba(color, 0.035);
      ctx.fillRect(lane.left, top, lane.width, bottom - top);
      ctx.fillStyle = rgba(color, 0.28);
      ctx.fillRect(lane.left, top, 1, bottom - top);
      ctx.fillRect(lane.right - 1, top, 1, bottom - top);
    });

    const zone = ctx.createLinearGradient(0, hitY - zoneHeight, 0, hitY);
    zone.addColorStop(0, "rgba(255,255,255,0)");
    zone.addColorStop(1, "rgba(255,244,226,0.1)");
    ctx.fillStyle = zone;
    ctx.fillRect(left, hitY - zoneHeight, right - left, zoneHeight);

    // Beat line with per-lane colour caps.
    ctx.fillStyle = "rgba(255, 246, 230, 0.85)";
    ctx.fillRect(left, hitY - 1, right - left, 2);
    lanes.forEach((lane, index) => {
      ctx.fillStyle = LANE_COLORS[index];
      ctx.fillRect(lane.left + 3, hitY + 3, lane.width - 6, 3);
    });

    const keySize = clamp(lanes[0].width * 0.28, 10, 15);
    ctx.font = `800 ${keySize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lanes.forEach((lane, index) => {
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.fillText(LANE_KEYS[index], lane.center, (hitY + bottom) / 2 + 3);
    });
    return canvas;
  }

  private buildNoteSprite(width: number, height: number, color: string, accent: boolean, scale: number): HTMLCanvasElement {
    const { canvas, ctx } = makeLayer((width + SPRITE_PAD * 2) * scale, (height + SPRITE_PAD * 2) * scale);
    ctx.scale(scale, scale);
    const x = SPRITE_PAD;
    const y = SPRITE_PAD;
    const radius = Math.min(5, height * 0.3);
    const face = ctx.createLinearGradient(0, y, 0, y + height);
    face.addColorStop(0, "#ffffff");
    face.addColorStop(0.28, color);
    face.addColorStop(1, rgba(color, 0.82));
    ctx.shadowColor = color;
    ctx.shadowBlur = accent ? 12 : 7; // baked once into the sprite
    ctx.fillStyle = face;
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = accent ? 2.2 : 1.4;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(x + width * 0.12, y + height * 0.2, width * 0.76, Math.max(1.5, height * 0.12));
    if (accent) {
      ctx.fillStyle = "#101320";
      ctx.beginPath();
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = height * 0.26;
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
    }
    return canvas;
  }

  private buildRibbonSprite(color: string): HTMLCanvasElement {
    const { canvas, ctx } = makeLayer(8, 64);
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, rgba(color, 0.18));
    gradient.addColorStop(1, rgba(color, 0.62));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 64);
    ctx.fillStyle = rgba(color, 0.9);
    ctx.fillRect(0, 0, 1, 64);
    ctx.fillRect(7, 0, 1, 64);
    return canvas;
  }

  // ---------------------------------------------------------------- frame

  /** Blender tunnel rings and floor rungs, scrolled toward the camera on the beat. */
  private drawDepth(state: RenderState): void {
    const ctx = this.context;
    const { width, height } = this.layout;
    const beat = Math.max(0, state.songTime * this.song.bpm / 60);
    const travel = this.reducedMotion ? 0 : beat % 1;
    const rungs = stageGeometry.stage.rungs;
    ctx.lineWidth = 1;
    for (let index = rungs.length - 1; index >= 1; index -= 1) {
      const far = rungs[index];
      const near = rungs[index - 1];
      const y = (far.y + (near.y - far.y) * travel) * height;
      const left = (far.left + (near.left - far.left) * travel) * width;
      const right = (far.right + (near.right - far.right) * travel) * width;
      ctx.fillStyle = this.rungStyles[index];
      ctx.fillRect(left, y, right - left, 1);
    }

    const rings = stageGeometry.stage.rings;
    const ringTravel = this.reducedMotion ? 0 : (beat / 2) % 1;
    for (let index = rings.length - 1; index >= 1; index -= 1) {
      const far = rings[index].points;
      const near = rings[index - 1].points;
      ctx.strokeStyle = this.ringStyles[index][(index + Math.floor(beat / 2)) % 5];
      ctx.beginPath();
      for (let point = 0; point < far.length; point += 2) {
        const x = (far[point] + (near[point] - far[point]) * ringTravel) * width;
        const y = (far[point + 1] + (near[point + 1] - far[point + 1]) * ringTravel) * height;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  private drawLaneLight(state: RenderState): void {
    if (!this.drawFallbackFx) return;
    const ctx = this.context;
    const { top, hitY } = this.layout;
    this.layout.lanes.forEach((lane, index) => {
      const pulse = state.lanePulse[index] ?? 0;
      if (pulse < 0.02) return;
      ctx.globalAlpha = Math.min(1, pulse * 0.16);
      ctx.fillStyle = LANE_COLORS[index];
      ctx.fillRect(lane.left, top, lane.width, hitY - top);
    });
    ctx.globalAlpha = 1;
  }

  private drawBeatLines(state: RenderState): void {
    const ctx = this.context;
    const { top, hitY, left, right } = this.layout;
    const secondsPerBeat = 60 / this.song.bpm;
    const approach = this.song.approachSeconds ?? 3.2;
    const current = state.songTime / secondsPerBeat;
    const first = Math.floor(current);
    const last = Math.ceil(current + approach / secondsPerBeat);
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    for (let beat = first; beat <= last; beat += 1) {
      const y = noteY(this.layout, beat * secondsPerBeat - state.songTime, approach);
      if (y < top || y > hitY - 2) continue;
      const bar = ((beat % this.song.beatsPerBar) + this.song.beatsPerBar) % this.song.beatsPerBar === 0;
      ctx.fillStyle = bar ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.09)";
      ctx.fillRect(left, Math.round(y), right - left, bar ? 1.5 : 1);
      if (bar && y > top + 16) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        const barNumber = Math.max(1, Math.floor(beat / this.song.beatsPerBar) + 1);
        const label = this.barLabels[barNumber] ?? (this.barLabels[barNumber] = String(barNumber).padStart(2, "0"));
        ctx.fillText(label, left + 4, y - 3);
      }
    }
  }

  private drawNotes(state: RenderState): void {
    const ctx = this.context;
    const layout = this.layout;
    const secondsPerBeat = 60 / this.song.bpm;
    const approach = this.song.approachSeconds ?? 3.2;
    const { noteWidth: width, noteHeight: height, top, hitY, bottom } = layout;
    this.hitAreaCount = 0;
    const notes = state.notes;
    if (this.cursorNotes !== notes) {
      this.cursorNotes = notes;
      this.firstVisible = 0;
    }
    while (this.firstVisible < notes.length && (notes[this.firstVisible].missed || notes[this.firstVisible].completed)) this.firstVisible += 1;
    for (let index = this.firstVisible; index < notes.length; index += 1) {
      const note = notes[index];
      if (note.missed || (note.hit && note.completed)) continue;
      const metric = layout.lanes[note.lane];
      if (!metric) continue;
      const noteTime = note.beat * secondsPerBeat;
      const until = noteTime - state.songTime;
      const endUntil = until + note.durationBeats * secondsPerBeat;
      const isHold = note.durationBeats >= HOLD_NOTE_MIN_BEATS;
      // Sorted by beat, so every later note is still above the stage.
      if (until > approach + 0.08) break;
      if (isHold ? endUntil < -0.25 : until < -0.3) continue;

      const rawHeadY = noteY(layout, until, approach);
      const headY = isHold && note.hit ? clamp(rawHeadY, top, hitY) : rawHeadY;
      const opacity = clamp((approach - until) / 0.24, 0.25, 1);
      ctx.globalAlpha = opacity;

      if (isHold) {
        const tailY = clamp(noteY(layout, endUntil, approach), top, bottom);
        const ribbonWidth = width * 0.56;
        if (headY - tailY > 2) {
          ctx.drawImage(this.ribbonSprites[note.lane], metric.center - ribbonWidth / 2, tailY, ribbonWidth, headY - tailY);
          if (note.holding) {
            const fillTop = headY - (headY - tailY) * clamp(note.holdProgress, 0, 1);
            ctx.fillStyle = "rgba(255,255,255,0.38)";
            ctx.fillRect(metric.center - ribbonWidth * 0.4, fillTop, ribbonWidth * 0.8, headY - fillTop);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(metric.center - ribbonWidth * 0.45, fillTop - 1, ribbonWidth * 0.9, 2);
          }
        }
        const tail = this.tailSprites[note.lane];
        const tailW = width * 0.84;
        const tailH = Math.max(8, height * 0.55);
        ctx.globalAlpha = opacity * 0.8;
        ctx.drawImage(tail, metric.center - tailW / 2 - SPRITE_PAD, tailY - tailH / 2 - SPRITE_PAD, tailW + SPRITE_PAD * 2, tailH + SPRITE_PAD * 2);
        ctx.globalAlpha = opacity;
      }

      const sprite = (note.accent || note.holding ? this.accentSprites : this.noteSprites)[note.lane];
      ctx.drawImage(sprite, metric.center - width / 2 - SPRITE_PAD, headY - height / 2 - SPRITE_PAD, width + SPRITE_PAD * 2, height + SPRITE_PAD * 2);

      const areaTop = clamp(headY - height / 2, top, bottom);
      const areaBottom = clamp(headY + height / 2, top, bottom);
      const area = this.noteHitAreas[this.hitAreaCount] ?? (this.noteHitAreas[this.hitAreaCount] = {
        id: "", lane: 0, left: 0, right: 0, top: 0, bottom: 0, centerX: 0, centerY: 0,
      });
      this.hitAreaCount += 1;
      area.id = note.id;
      area.lane = note.lane;
      area.left = metric.center - width / 2;
      area.right = metric.center + width / 2;
      area.top = areaTop;
      area.bottom = areaBottom;
      area.centerX = metric.center;
      area.centerY = (areaTop + areaBottom) / 2;
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(delta: number): void {
    const ctx = this.context;
    let write = 0;
    for (const particle of this.particles) {
      particle.life -= delta;
      if (particle.life <= 0) continue;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 260 * delta;
      ctx.globalAlpha = clamp(particle.life * 2, 0, 1);
      ctx.fillStyle = LANE_COLORS[particle.lane];
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      this.particles[write++] = particle;
    }
    this.particles.length = write;
    ctx.globalAlpha = 1;
  }

  private drawPause(): void {
    const ctx = this.context;
    const { width, height } = this.layout;
    ctx.fillStyle = "rgba(4, 6, 12, 0.78)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff6e6";
    ctx.font = `800 ${clamp(width * 0.075, 22, 40)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("잠시 쉬는 중", width / 2, height / 2 - 14);
    ctx.font = `650 ${clamp(width * 0.034, 12, 17)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.fillText("ESC 또는 재생 버튼으로 계속해요", width / 2, height / 2 + 22);
  }
}
