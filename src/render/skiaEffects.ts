import type { GameSnapshot } from "../engine/game";
import type { RuntimeNote } from "../types";
import type { LaneLayout } from "./stageLayout";
import wasmUrl from "canvaskit-wasm/bin/canvaskit.wasm?url";

interface BurstParticle {
  lane: number;
  angle: number;
  speed: number;
  age: number;
  life: number;
  size: number;
}

type CanvasKitApi = Record<string, any>;

const colors = [
  [63, 224, 216],
  [255, 95, 162],
  [255, 201, 74],
  [111, 220, 106],
  [111, 155, 255],
] as const;

/** Lane colors as 0..1 floats for Paint.setColorComponents (no Float32Array per call). */
const unitColors = colors.map(([red, green, blue]) => [red / 255, green / 255, blue / 255] as const);

const isActiveHold = (note: RuntimeNote): boolean => note.holding && !note.completed;

/** Fills a reusable CanvasKit RRect (rect + four equal corner radii) in place. */
function setRRect(target: Float32Array, x: number, y: number, width: number, height: number, radius: number): Float32Array {
  target[0] = x;
  target[1] = y;
  target[2] = x + width;
  target[3] = y + height;
  for (let index = 4; index < 12; index += 1) target[index] = radius;
  return target;
}

/**
 * Lazy CanvasKit (Skia WASM) layer for the stage's premium effects only:
 * lane light, hold energy and hit debris. It reads the same LaneLayout the
 * Canvas 2D renderer uses, so effects line up with notes at every size.
 */
export class SkiaEffectsRenderer {
  private kit: CanvasKitApi | null = null;
  private surface: any = null;
  private grContext: any = null;
  private glContextHandle = 0;
  private loading: Promise<void> | null = null;
  private particles: BurstParticle[] = [];
  private layout: LaneLayout | null = null;
  private density = 1;
  private pixelWidth = 0;
  private pixelHeight = 0;
  private lastFrame = performance.now();
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private failed = false;
  private particleScale = 1;
  private laneBlur: any = null;
  private holdBlur: any = null;
  private particleBlur: any = null;
  /** One Paint for the whole session instead of one per frame. */
  private paint: any = null;
  private readonly rrect = new Float32Array(12);
  /** True once the surface was cleared and nothing has been drawn since (idle frames skip the GPU). */
  private blank = false;

  /** Called with true once Skia is drawing, false when it stops (failure / context loss). */
  onActiveChange: (active: boolean) => void = () => {};

  constructor(private element: HTMLCanvasElement) {
    element.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.disable(new Error("WebGL context lost"), "Skia GPU 컨텍스트가 사라져 기본 효과로 전환합니다.");
    });
  }

  get active(): boolean {
    return Boolean(this.kit && this.surface && !this.failed);
  }

  setParticleScale(value: number): void {
    this.particleScale = Math.max(0, Math.min(1, value));
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  initialize(): Promise<void> {
    if (this.failed) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = import("canvaskit-wasm").then(async ({ default: CanvasKitInit }) => {
      this.kit = await CanvasKitInit({ locateFile: () => wasmUrl });
      this.laneBlur = this.kit.MaskFilter.MakeBlur(this.kit.BlurStyle.Normal, 18, true);
      this.holdBlur = this.kit.MaskFilter.MakeBlur(this.kit.BlurStyle.Normal, 10, true);
      this.particleBlur = this.kit.MaskFilter.MakeBlur(this.kit.BlurStyle.Normal, 2.5, true);
      if (this.layout) this.setLayout(this.layout, this.density);
      if (this.failed) return;
      this.element.dataset.renderer = "skia";
      this.onActiveChange(true);
    }).catch((error) => {
      this.disable(error, "Skia 효과 레이어를 시작하지 못해 기본 효과로 계속합니다.");
    });
    return this.loading;
  }

  /** Disables Skia permanently for this session (e.g. low quality preset). */
  shutdown(): void {
    if (!this.failed) this.disable(null, "");
  }

  setLayout(layout: LaneLayout, dprCap: number): void {
    this.layout = layout;
    this.density = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
    if (this.failed || !this.kit) return;
    try {
      const pixelWidth = Math.round(layout.width * this.density);
      const pixelHeight = Math.round(layout.height * this.density);
      if (this.surface && pixelWidth === this.pixelWidth && pixelHeight === this.pixelHeight) return;
      this.pixelWidth = pixelWidth;
      this.pixelHeight = pixelHeight;
      this.surface?.delete?.();
      this.surface = null;
      this.element.width = pixelWidth;
      this.element.height = pixelHeight;
      if (!this.grContext) {
        this.glContextHandle = this.kit.GetWebGLContext(this.element, { antialias: 0, alpha: 1 });
        if (!this.glContextHandle) throw new Error("WebGL context creation failed.");
        this.grContext = this.kit.MakeWebGLContext(this.glContextHandle);
        if (!this.grContext) throw new Error("Skia GPU context creation failed.");
      }
      this.surface = this.kit.MakeOnScreenGLSurface(this.grContext, pixelWidth, pixelHeight, this.kit.ColorSpace.SRGB);
      if (!this.surface) throw new Error("Skia surface creation failed.");
      this.blank = false;
    } catch (error) {
      this.disable(error, "Skia 표면을 만들지 못해 기본 효과로 계속합니다.");
    }
  }

  burst(lane: number): void {
    if (!this.active) return;
    const amount = Math.round((this.reducedMotion ? 5 : 18) * Math.max(0.3, this.particleScale));
    for (let index = 0; index < amount; index += 1) {
      this.particles.push({
        lane,
        angle: -Math.PI + Math.random() * Math.PI,
        speed: 70 + Math.random() * 220,
        age: 0,
        life: 0.38 + Math.random() * 0.38,
        size: 1.6 + Math.random() * 3.6,
      });
    }
  }

  clear(): void {
    this.particles = [];
    this.blank = false;
  }

  render(snapshot: GameSnapshot): void {
    const layout = this.layout;
    if (!this.kit || !this.surface || this.failed || !layout) return;
    const now = performance.now();
    const delta = snapshot.paused ? 0 : Math.min(0.04, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    // Paused: blank the layer once so the pause card reads cleanly, then stop touching the GPU.
    const busy = !snapshot.paused && (this.particles.length > 0 || snapshot.lanePulse.some((pulse) => pulse > 0.02) || snapshot.notes.some(isActiveHold));
    if (!busy) {
      if (this.blank) return;
    }
    try {
      const kit = this.kit;
      const canvas = this.surface.getCanvas();
      canvas.clear(kit.TRANSPARENT);
      if (!busy) {
        this.surface.flush();
        this.blank = true;
        return;
      }
      this.blank = false;
      canvas.save();
      canvas.scale(this.density, this.density);
      const { top, hitY, lanes } = layout;
      const paint = this.paint ?? (this.paint = new kit.Paint());
      paint.setAntiAlias(true);
      const rrect = this.rrect;

      paint.setMaskFilter(this.laneBlur);
      snapshot.lanePulse.forEach((pulse, lane) => {
        if (pulse <= 0.02) return;
        const metric = lanes[lane];
        const [red, green, blue] = unitColors[lane];
        paint.setColorComponents(red, green, blue, Math.min(0.3, pulse * 0.26));
        canvas.drawRRect(setRRect(rrect, metric.left + 4, top, metric.width - 8, hitY - top, 10), paint);
      });

      paint.setMaskFilter(this.holdBlur);
      for (const note of snapshot.notes) {
        if (!isActiveHold(note)) continue;
        const metric = lanes[note.lane];
        const [red, green, blue] = unitColors[note.lane];
        const fillHeight = (hitY - top) * Math.max(0.05, note.holdProgress) * 0.6;
        paint.setColorComponents(red, green, blue, 0.2 + note.holdProgress * 0.2);
        canvas.drawRRect(setRRect(rrect, metric.left + metric.width * 0.2, hitY - fillHeight, metric.width * 0.6, fillHeight, 8), paint);
      }

      paint.setMaskFilter(this.particleBlur);
      let write = 0;
      for (const particle of this.particles) {
        particle.age += delta;
        if (particle.age >= particle.life) continue;
        const progress = particle.age / particle.life;
        const metric = lanes[particle.lane];
        const distance = particle.speed * particle.age;
        const x = metric.center + Math.cos(particle.angle) * distance;
        const y = hitY + Math.sin(particle.angle) * distance + progress * progress * 60;
        const [red, green, blue] = unitColors[particle.lane];
        paint.setColorComponents(red, green, blue, 1 - progress);
        canvas.drawCircle(x, y, particle.size * (1 - progress * 0.5), paint);
        this.particles[write++] = particle;
      }
      this.particles.length = write;
      paint.setMaskFilter(null);
      canvas.restore();
      this.surface.flush();
    } catch (error) {
      this.disable(error, "Skia 효과를 중단하고 기본 렌더러로 계속합니다.");
    }
  }

  private disable(error: unknown, message: string): void {
    const wasActive = this.active;
    this.failed = true;
    this.element.dataset.renderer = "fallback";
    this.paint?.delete?.();
    this.paint = null;
    this.surface?.delete?.();
    this.surface = null;
    this.laneBlur?.delete?.();
    this.holdBlur?.delete?.();
    this.particleBlur?.delete?.();
    this.laneBlur = null;
    this.holdBlur = null;
    this.particleBlur = null;
    try {
      this.grContext?.releaseResourcesAndAbandonContext?.();
      this.grContext?.delete?.();
      if (this.glContextHandle && this.kit) this.kit.deleteContext(this.glContextHandle);
    } catch {
      // The GPU context may already be gone after a context loss.
    }
    this.grContext = null;
    this.glContextHandle = 0;
    this.particles = [];
    if (message) console.warn(message, error);
    if (wasActive || message) this.onActiveChange(false);
  }
}
