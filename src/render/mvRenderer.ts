import { stageGeometry } from "../content/stageGeometry.generated";
import type { Song } from "../types";
import type { QualityProfile } from "./quality";
import type { Rect, ViewportLayout } from "./stageLayout";
import { FlashLimiter, MV_SCENES, mvShake, songMotif, type MvScene, type SongMotif, type VisualFrame } from "./visualTimeline";

/**
 * Music-video layer that fills the space around the 9:16 stage.
 * WebGL2 draws every scene procedurally from the Blender geometry numbers and
 * the VisualTimeline frame; Canvas 2D and a CSS gradient are the fallbacks.
 */

export type MvMode = "webgl2" | "canvas2d" | "css";

export const MV_SCENE_LABELS: Record<MvScene, string> = {
  portal: "빛의 포털",
  city: "도시와 파형",
  ribbon: "가락 리본",
  listen: "귀 기울이기",
  kaleido: "피날레 만화경",
};

const MAX_TOWERS = 36;
const MAX_MELODY = 8;

const VERTEX_SOURCE = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform vec4 uStage;
uniform int uAxis;
uniform float uTime;
uniform float uBeat;
uniform float uPulse;
uniform float uEnergy;
uniform float uBlend;
uniform float uFlash;
uniform float uMotion;
uniform int uScene;
uniform int uPrev;
uniform int uMotif;
uniform vec3 uColors[5];
uniform vec3 uNight;
uniform vec4 uTowers[${MAX_TOWERS}];
uniform float uTowerLayer[${MAX_TOWERS}];
uniform int uTowerCount;
uniform float uHorizon;
uniform vec3 uRing;
uniform vec2 uMelody[${MAX_MELODY}];
uniform int uMelodyCount;
uniform vec2 uShake;

const float TAU = 6.2831853;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 palette(float i) { return uColors[int(mod(floor(i), 5.0))]; }
float glowLine(float d, float w) { return exp(-(d * d) / (w * w)); }

vec3 sky(vec2 q) {
  float h = clamp((q.y - (uHorizon - 0.6)) / 0.6, 0.0, 1.0);
  return mix(uNight, mix(uNight, uColors[4], 0.35), h * h);
}

// Tunnel whose ring spacing is the Blender corridor depth (uRing = k, near, spacing).
vec3 scenePortal(vec2 q) {
  vec2 d = q - vec2(0.5, uHorizon);
  float r = max(length(d), 0.002);
  float a = atan(d.y, d.x);
  float z = uRing.x / r;
  float n = (z - uRing.y) / uRing.z + uBeat * 0.5 * uMotion;
  float f = abs(fract(n) - 0.5);
  float fade = clamp(1.0 - z / 90.0, 0.0, 1.0);
  float ring = smoothstep(0.44 - 0.03 * uPulse, 0.5, f) * fade;
  float spokes = pow(abs(cos(a * float(5 + uMotif) * 0.5)), 40.0) * fade;
  vec3 col = sky(q) * 0.6;
  col += palette(floor(n)) * ring * (0.8 + uPulse * 0.8);
  col += uColors[2] * spokes * 0.3;
  col += uColors[0] * exp(-r * 18.0) * (0.4 + uEnergy * 0.8);
  return col;
}

// Blender city block silhouettes with lit windows, a scrolling floor grid and a waveform.
vec3 sceneCity(vec2 q) {
  vec3 col = sky(q);
  col += uColors[0] * step(0.992, hash(floor(q * 120.0))) * step(q.y, uHorizon) * 0.6;
  if (q.y > uHorizon) {
    float dy = q.y - uHorizon;
    float depth = 0.06 / dy;
    float rows = abs(fract(depth - uBeat * 0.5 * uMotion) - 0.5);
    float cols = abs(fract((q.x - 0.5) * depth * 6.0) - 0.5);
    float fade = clamp(dy * 6.0, 0.0, 1.0);
    col = uNight * 0.8;
    col += uColors[1] * smoothstep(0.46, 0.5, rows) * fade * (0.35 + uPulse * 0.4);
    col += uColors[2] * smoothstep(0.47, 0.5, cols) * fade * 0.3;
  }
  for (int i = 0; i < ${MAX_TOWERS}; i++) {
    if (i >= uTowerCount) break;
    vec4 t = uTowers[i];
    if (abs(q.x - t.x) < t.y * 0.5 && q.y > t.z && q.y < t.w) {
      float haze = uTowerLayer[i] / 2.0;
      vec3 body = mix(uNight * 0.45, mix(uNight, uColors[4], 0.4), haze * 0.7);
      vec2 cell = vec2((q.x - t.x + t.y * 0.5) / t.y * float(3 + uMotif % 3), (q.y - t.z) / 0.012);
      float lit = step(0.72 - uEnergy * 0.35, hash(floor(cell) + float(i) * 7.0 + floor(uBeat * 0.5)));
      float mask = step(0.25, fract(cell.x)) * step(0.3, fract(cell.y));
      col = body + palette(float(i) + floor(cell.y)) * lit * mask * (0.35 + 0.25 * (1.0 - haze));
      col += uColors[3] * glowLine(q.y - t.z, 0.002) * (0.3 + uPulse);
    }
  }
  float amp = 0.02 + 0.05 * uEnergy + 0.03 * uPulse;
  float w = sin(q.x * 18.0 + uTime * 3.0 * uMotion) * 0.6 + sin(q.x * 41.0 - uTime * 5.0 * uMotion) * 0.4;
  float wy = uHorizon - 0.22 + w * amp;
  col += uColors[2] * glowLine(q.y - wy, 0.004 + 0.004 * uPulse) * 0.9;
  col += uColors[1] * glowLine(q.y - wy - 0.02, 0.003) * 0.4;
  return col;
}

float melodyX(float until) { return 1.0 - clamp(until / 3.0, -0.1, 1.2); }

float melodyShape(float x) {
  float sum = 0.0;
  float wsum = 0.0001;
  for (int i = 0; i < ${MAX_MELODY}; i++) {
    if (i >= uMelodyCount) break;
    vec2 m = uMelody[i];
    float w = exp(-pow((x - melodyX(m.x)) * 6.0, 2.0));
    sum += (m.y - 0.5) * w;
    wsum += w;
  }
  return sum / wsum * min(wsum, 1.0);
}

// Ribbons shaped by the upcoming melody (x = 1 is "now" at the stage edge).
vec3 sceneRibbon(vec2 q) {
  vec3 col = sky(q) * 0.8;
  float shape = melodyShape(q.x);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float y = 0.5 - shape * 0.35 + sin(q.x * 5.0 + uTime * 1.4 * uMotion + fk * 2.1) * 0.03 * (1.0 + fk) + (fk - 1.0) * 0.05;
    float d = q.y - y;
    col += palette(fk + 1.0) * (glowLine(d, 0.006 + 0.004 * uPulse) * 0.9 + glowLine(d, 0.05) * 0.18);
  }
  for (int i = 0; i < ${MAX_MELODY}; i++) {
    if (i >= uMelodyCount) break;
    vec2 m = uMelody[i];
    vec2 p = vec2(melodyX(m.x), 0.5 - (m.y - 0.5) * 0.35);
    vec2 dd = q - p;
    col += palette(m.y * 4.0) * exp(-dot(dd, dd) * 4000.0) * 0.9;
  }
  return col;
}

// Calm listening scene: slow aurora and one soft ripple per bar, no flashes.
vec3 sceneListen(vec2 q) {
  vec3 col = mix(uNight, uColors[4] * 0.25, clamp(1.0 - q.y, 0.0, 1.0) * 0.5);
  float band = sin(q.x * 3.0 + uTime * 0.35 * uMotion + sin(q.y * 4.0 + uTime * 0.2 * uMotion));
  col += uColors[2] * exp(-pow((q.y - 0.35 - band * 0.06) * 9.0, 2.0)) * 0.22;
  col += uColors[3] * exp(-pow((q.y - 0.55 + band * 0.05) * 11.0, 2.0)) * 0.14;
  float phase = fract(uBeat * 0.25);
  col += uColors[0] * glowLine(length(q - vec2(0.5, 0.55)) - phase * 0.7, 0.006) * (1.0 - phase) * 0.35;
  return col;
}

// Finale kaleidoscope; segment count follows the song motif.
vec3 sceneKaleido(vec2 q) {
  vec2 d = q - vec2(0.5, 0.5);
  float r = length(d);
  float seg = TAU / float(6 + uMotif);
  float a = atan(d.y, d.x) + uTime * 0.15 * uMotion;
  a = abs(mod(a, seg) - seg * 0.5);
  vec2 p = vec2(cos(a), sin(a)) * r;
  float pat = sin(p.x * 28.0 - uBeat * 3.14159 * uMotion) * sin(p.y * 34.0 + uTime * uMotion);
  vec3 col = uNight * 0.8;
  col += palette(r * 10.0 - uBeat * 0.5) * smoothstep(0.2, 0.9, pat) * (0.35 + uEnergy * 0.5) * exp(-r * 1.4);
  col += uColors[0] * glowLine(r - 0.08 - uPulse * 0.05, 0.01) * 0.6;
  return col;
}

vec3 sceneColor(int s, vec2 q) {
  if (s == 0) return scenePortal(q);
  if (s == 1) return sceneCity(q);
  if (s == 2) return sceneRibbon(q);
  if (s == 3) return sceneListen(q);
  return sceneKaleido(q);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec4 panel;
  bool mirror = false;
  float dist;
  if (uAxis == 0) {
    if (px.x < uStage.x) { panel = vec4(0.0, 0.0, uStage.x, uRes.y); dist = uStage.x - px.x; }
    else if (px.x >= uStage.x + uStage.z) { panel = vec4(uStage.x + uStage.z, 0.0, uRes.x - uStage.x - uStage.z, uRes.y); mirror = true; dist = px.x - panel.x; }
    else { outColor = vec4(uNight, 1.0); return; }
  } else {
    if (px.y < uStage.y) { panel = vec4(0.0, 0.0, uRes.x, uStage.y); dist = uStage.y - px.y; }
    else if (px.y >= uStage.y + uStage.w) { panel = vec4(0.0, uStage.y + uStage.w, uRes.x, uRes.y - uStage.y - uStage.w); dist = px.y - panel.y; }
    else { outColor = vec4(uNight, 1.0); return; }
  }
  float s = max(panel.z, 1.0);
  vec2 q = (px - (panel.xy + panel.zw * 0.5)) / s + 0.5;
  if (mirror) q.x = 1.0 - q.x;
  q += uShake;
  vec3 col = sceneColor(uScene, q);
  if (uBlend < 0.999) col = mix(sceneColor(uPrev, q), col, uBlend);
  col += uColors[2] * exp(-dist / (s * 0.04)) * (0.12 + uPulse * 0.25);
  col += uColors[3] * uFlash * 0.18;
  col *= 1.0 - 0.35 * smoothstep(0.4, 1.2, length(q - 0.5));
  outColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.9)), 1.0);
}`;

type UniformName =
  | "uRes" | "uStage" | "uAxis" | "uTime" | "uBeat" | "uPulse" | "uEnergy" | "uBlend" | "uFlash" | "uMotion"
  | "uScene" | "uPrev" | "uMotif" | "uColors" | "uNight" | "uTowers" | "uTowerLayer" | "uTowerCount"
  | "uHorizon" | "uRing" | "uMelody" | "uMelodyCount" | "uShake";

const UNIFORMS: UniformName[] = [
  "uRes", "uStage", "uAxis", "uTime", "uBeat", "uPulse", "uEnergy", "uBlend", "uFlash", "uMotion",
  "uScene", "uPrev", "uMotif", "uColors", "uNight", "uTowers", "uTowerLayer", "uTowerCount",
  "uHorizon", "uRing", "uMelody", "uMelodyCount", "uShake",
];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255) as [number, number, number];
}

/** Blender tunnel perspective: screen radius r at view depth z satisfies r * z = k. */
export function ringPerspective(): { k: number; near: number; spacing: number } {
  const rings = stageGeometry.stage.rings;
  const points = rings[0].points;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 1; index < points.length; index += 2) {
    minY = Math.min(minY, points[index]);
    maxY = Math.max(maxY, points[index]);
  }
  const radius = (maxY - minY) / 2;
  const near = rings[0].depth;
  const spacing = Math.max(0.1, rings.length > 1 ? rings[1].depth - rings[0].depth : 4);
  return { k: radius * near * 0.5, near, spacing };
}

const TOWER_DATA = (() => {
  const towers = stageGeometry.mv.towers.slice(0, MAX_TOWERS);
  const rects = new Float32Array(MAX_TOWERS * 4);
  const layers = new Float32Array(MAX_TOWERS);
  towers.forEach((tower, index) => {
    rects.set([tower.x, tower.w, tower.top, tower.base], index * 4);
    layers[index] = tower.layer;
  });
  return { rects, layers, count: towers.length };
})();

export class MvRenderer {
  mode: MvMode = "css";
  onModeChange: (mode: MvMode) => void = () => {};

  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uniforms = new Map<UniformName, WebGLUniformLocation | null>();
  private flat: CanvasRenderingContext2D | null = null;
  private initialized = false;
  private motif: SongMotif = songMotif("neon-run");
  private beatsPerBar = 4;
  private layout: ViewportLayout | null = null;
  private scale = 1;
  private frameMs = 0;
  private lastDraw = 0;
  private lastFrame: VisualFrame | null = null;
  private flashes = new FlashLimiter(3);
  private flash = 0;
  private lastDownbeatBar = -1;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private readonly ring = ringPerspective();

  constructor(private glCanvas: HTMLCanvasElement, private flatCanvas: HTMLCanvasElement) {
    glCanvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.program = null;
      this.vao = null;
      this.gl = null;
      console.warn("MV WebGL 컨텍스트가 사라져 Canvas 2D로 전환합니다.");
      this.setMode(this.flatContext() ? "canvas2d" : "css");
      this.redraw();
    });
    glCanvas.addEventListener("webglcontextrestored", () => {
      if (!this.initGl()) return;
      this.setMode("webgl2");
      this.redraw();
    });
  }

  /** Creates the WebGL2 program on first game start; falls back to Canvas 2D, then CSS. */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    if (this.initGl()) this.setMode("webgl2");
    else this.setMode(this.flatContext() ? "canvas2d" : "css");
  }

  setSong(song: Song): void {
    this.motif = songMotif(song.id);
    this.beatsPerBar = song.beatsPerBar;
    this.lastDownbeatBar = -1;
    this.lastFrame = null;
    this.flashes.reset();
    this.flash = 0;
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  setLayout(layout: ViewportLayout, quality: QualityProfile): void {
    this.layout = layout;
    this.frameMs = quality.mvFrameMs;
    this.flashes.setLimit(quality.flashesPerSecond);
    const dpr = Math.max(1, Math.min(quality.mvDpr, window.devicePixelRatio || 1));
    this.scale = dpr * quality.mvScale;
    const width = Math.max(1, Math.round(layout.viewport.width * this.scale));
    const height = Math.max(1, Math.round(layout.viewport.height * this.scale));
    for (const canvas of [this.glCanvas, this.flatCanvas]) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    }
    this.redraw();
  }

  /**
   * Draws the MV for a VisualTimeline frame built from the AudioEngine game time,
   * so the scenes follow what the student hears. Paused frames draw once and hold.
   */
  render(frame: VisualFrame, paused = false): void {
    const now = performance.now();
    const force = paused || this.lastFrame === null;
    this.lastFrame = frame;
    if (!paused) this.updateFlash(frame);
    if (!force && this.frameMs > 0 && now - this.lastDraw < this.frameMs) return;
    this.lastDraw = now;
    this.draw(frame);
  }

  private redraw(): void {
    if (this.lastFrame) this.draw(this.lastFrame);
  }

  private draw(frame: VisualFrame): void {
    if (!this.layout || this.layout.panels.length === 0) return;
    if (this.mode === "webgl2") this.drawGl(frame);
    else if (this.mode === "canvas2d") this.drawFlat(frame);
  }

  private flatContext(): CanvasRenderingContext2D | null {
    if (!this.flat) this.flat = this.flatCanvas.getContext("2d", { alpha: false });
    return this.flat;
  }

  private setMode(mode: MvMode): void {
    this.mode = mode;
    this.glCanvas.hidden = mode !== "webgl2";
    this.flatCanvas.hidden = mode !== "canvas2d";
    this.onModeChange(mode);
  }

  private updateFlash(frame: VisualFrame): void {
    this.flash *= 0.86;
    const bar = Math.floor(frame.beat / this.beatsPerBar);
    const flashScene = frame.scene === "kaleido" || frame.scene === "city";
    if (!this.reducedMotion && flashScene && frame.downbeat && bar !== this.lastDownbeatBar && frame.energy > 0.45) {
      this.lastDownbeatBar = bar;
      if (this.flashes.request(frame.songTime)) this.flash = 1;
    }
  }

  // ------------------------------------------------------------------ WebGL2

  private initGl(): boolean {
    try {
      const gl = this.glCanvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power" });
      if (!gl) return false;
      const compile = (type: number, source: string): WebGLShader => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("셰이더를 만들 수 없습니다.");
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(shader) ?? "shader error");
        return shader;
      };
      const program = gl.createProgram();
      if (!program) return false;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SOURCE));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SOURCE));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
      this.gl = gl;
      this.program = program;
      this.vao = gl.createVertexArray();
      this.uniforms.clear();
      UNIFORMS.forEach((name) => this.uniforms.set(name, gl.getUniformLocation(program, name)));
      return true;
    } catch (error) {
      console.warn("MV WebGL2를 시작하지 못해 Canvas 2D로 전환합니다.", error);
      this.gl = null;
      this.program = null;
      return false;
    }
  }

  private drawGl(frame: VisualFrame): void {
    const gl = this.gl;
    const layout = this.layout;
    if (!gl || !this.program || !layout || gl.isContextLost()) return;
    const u = (name: UniformName) => this.uniforms.get(name) ?? null;
    const scale = this.scale;
    const stage = layout.stage;
    const motion = this.reducedMotion ? 0.25 : 1;
    const shake = mvShake(frame, this.reducedMotion) * 0.006;

    gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(u("uRes"), this.glCanvas.width, this.glCanvas.height);
    gl.uniform4f(u("uStage"), stage.x * scale, stage.y * scale, stage.width * scale, stage.height * scale);
    gl.uniform1i(u("uAxis"), stage.x > 0 ? 0 : 1);
    gl.uniform1f(u("uTime"), frame.songTime);
    gl.uniform1f(u("uBeat"), Math.max(0, frame.beat));
    gl.uniform1f(u("uPulse"), frame.scene === "listen" ? frame.beatPulse * 0.3 : frame.beatPulse);
    gl.uniform1f(u("uEnergy"), frame.energy);
    gl.uniform1f(u("uBlend"), frame.sceneBlend);
    gl.uniform1f(u("uFlash"), this.flash);
    gl.uniform1f(u("uMotion"), motion);
    gl.uniform1i(u("uScene"), frame.sceneIndex);
    gl.uniform1i(u("uPrev"), MV_SCENES.indexOf(frame.previousScene));
    gl.uniform1i(u("uMotif"), this.motif.id);
    gl.uniform3fv(u("uColors"), new Float32Array(this.motif.colors.flatMap(hexToRgb)));
    gl.uniform3fv(u("uNight"), new Float32Array(hexToRgb(this.motif.night)));
    gl.uniform4fv(u("uTowers"), TOWER_DATA.rects);
    gl.uniform1fv(u("uTowerLayer"), TOWER_DATA.layers);
    gl.uniform1i(u("uTowerCount"), TOWER_DATA.count);
    gl.uniform1f(u("uHorizon"), stageGeometry.mv.horizonY);
    gl.uniform3f(u("uRing"), this.ring.k, this.ring.near, this.ring.spacing);
    const melody = new Float32Array(MAX_MELODY * 2);
    frame.melody.slice(0, MAX_MELODY).forEach((point, index) => melody.set([point.until, point.pitch], index * 2));
    gl.uniform2fv(u("uMelody"), melody);
    gl.uniform1i(u("uMelodyCount"), Math.min(MAX_MELODY, frame.melody.length));
    gl.uniform2f(u("uShake"), Math.sin(frame.songTime * 37) * shake, Math.cos(frame.songTime * 29) * shake);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ------------------------------------------------------------------ Canvas 2D fallback

  private drawFlat(frame: VisualFrame): void {
    const ctx = this.flat;
    const layout = this.layout;
    if (!ctx || !layout) return;
    const scale = this.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.motif.night;
    ctx.fillRect(0, 0, this.flatCanvas.width, this.flatCanvas.height);
    layout.panels.forEach((panel, index) => {
      const rect: Rect = { x: panel.x * scale, y: panel.y * scale, width: panel.width * scale, height: panel.height * scale };
      if (rect.width < 1 || rect.height < 1) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();
      drawFlatScene(ctx, rect, frame, this.motif, index === 1 && layout.stage.x > 0, this.reducedMotion);
      ctx.restore();
    });
  }
}

/** Simplified Canvas 2D version of each MV scene, used when WebGL2 is unavailable. */
export function drawFlatScene(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  frame: VisualFrame,
  motif: SongMotif,
  mirror: boolean,
  reducedMotion: boolean,
): void {
  const size = rect.width;
  const originX = rect.x + rect.width / 2 - size / 2;
  const originY = rect.y + rect.height / 2 - size / 2;
  const px = (nx: number) => originX + (mirror ? 1 - nx : nx) * size;
  const py = (ny: number) => originY + ny * size;
  const [white, coral, teal, gold, blue] = motif.colors;
  const pulse = frame.scene === "listen" ? frame.beatPulse * 0.3 : frame.beatPulse;
  const horizon = stageGeometry.mv.horizonY;
  const beat = Math.max(0, frame.beat) * (reducedMotion ? 0.25 : 1);

  const sky = ctx.createLinearGradient(0, rect.y, 0, py(horizon));
  sky.addColorStop(0, motif.night);
  sky.addColorStop(1, `${blue}55`);
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.lineWidth = Math.max(1, size * 0.004);

  switch (frame.scene) {
    case "portal": {
      const cx = px(0.5);
      const cy = py(horizon);
      const ring = ringPerspective();
      for (let index = 0; index < 12; index += 1) {
        const depth = ring.near + (index - ((beat * 0.5) % 1)) * ring.spacing;
        if (depth <= 0.5) continue;
        const radius = (ring.k / depth) * size;
        ctx.strokeStyle = motif.colors[index % 5];
        ctx.globalAlpha = Math.max(0, 1 - depth / 90) * (0.6 + pulse * 0.4);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "city": {
      for (const tower of stageGeometry.mv.towers) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = tower.layer === 0 ? "#05070d" : tower.layer === 1 ? "#0d1426" : "#18213a";
        const left = px(tower.x - tower.w / 2);
        const right = px(tower.x + tower.w / 2);
        ctx.fillRect(Math.min(left, right), py(tower.top), Math.abs(right - left), py(tower.base) - py(tower.top));
        ctx.fillStyle = gold;
        ctx.globalAlpha = 0.3 + pulse * 0.6;
        ctx.fillRect(Math.min(left, right), py(tower.top), Math.abs(right - left), Math.max(1, size * 0.003));
      }
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = teal;
      ctx.beginPath();
      for (let step = 0; step <= 48; step += 1) {
        const nx = step / 48;
        const amp = 0.02 + 0.05 * frame.energy + 0.03 * pulse;
        const wave = Math.sin(nx * 18 + frame.songTime * 3) * 0.6 + Math.sin(nx * 41 - frame.songTime * 5) * 0.4;
        const y = py(horizon - 0.22 + wave * amp);
        if (step === 0) ctx.moveTo(px(nx), y);
        else ctx.lineTo(px(nx), y);
      }
      ctx.stroke();
      break;
    }
    case "ribbon": {
      [coral, teal, gold].forEach((color, k) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(2, size * (0.008 + pulse * 0.006));
        ctx.beginPath();
        for (let step = 0; step <= 40; step += 1) {
          const nx = step / 40;
          let sum = 0;
          let weight = 0.0001;
          for (const point of frame.melody) {
            const w = Math.exp(-(((nx - (1 - Math.max(-0.1, Math.min(1.2, point.until / 3)))) * 6) ** 2));
            sum += (point.pitch - 0.5) * w;
            weight += w;
          }
          const shape = (sum / weight) * Math.min(weight, 1);
          const y = 0.5 - shape * 0.35 + Math.sin(nx * 5 + frame.songTime * 1.4 + k * 2.1) * 0.03 * (1 + k) + (k - 1) * 0.05;
          if (step === 0) ctx.moveTo(px(nx), py(y));
          else ctx.lineTo(px(nx), py(y));
        }
        ctx.stroke();
      });
      break;
    }
    case "listen": {
      const phase = (beat * 0.25) % 1;
      ctx.strokeStyle = white;
      ctx.globalAlpha = (1 - phase) * 0.35;
      ctx.beginPath();
      ctx.arc(px(0.5), py(0.55), phase * 0.7 * size, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "kaleido": {
      const segments = 6 + motif.id;
      ctx.translate(px(0.5), py(0.5));
      ctx.rotate(frame.songTime * 0.15 * (reducedMotion ? 0.25 : 1));
      for (let index = 0; index < segments; index += 1) {
        ctx.rotate((Math.PI * 2) / segments);
        ctx.fillStyle = motif.colors[(index + Math.floor(beat)) % 5];
        ctx.globalAlpha = 0.35 + frame.energy * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size * 0.42, -size * 0.06);
        ctx.lineTo(size * (0.28 + pulse * 0.05), size * 0.07);
        ctx.closePath();
        ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      break;
    }
  }
  ctx.globalAlpha = 1;
}
