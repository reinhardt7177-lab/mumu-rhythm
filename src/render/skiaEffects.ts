import type { GameSnapshot } from "../engine/game";
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
  [64, 236, 220],
  [255, 82, 147],
  [255, 205, 72],
  [97, 231, 117],
  [106, 145, 255],
] as const;

export class SkiaEffectsRenderer {
  private kit: CanvasKitApi | null = null;
  private surface: any = null;
  private grContext: any = null;
  private glContextHandle = 0;
  private loading: Promise<void> | null = null;
  private particles: BurstParticle[] = [];
  private width = 1;
  private height = 1;
  private density = 1;
  private pixelWidth = 0;
  private pixelHeight = 0;
  private lastFrame = performance.now();
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private failed = false;
  private laneBlur: any = null;
  private holdBlur: any = null;
  private particleBlur: any = null;

  constructor(private element: HTMLCanvasElement) {}

  initialize(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = import("canvaskit-wasm").then(async ({ default: CanvasKitInit }) => {
      this.kit = await CanvasKitInit({ locateFile: () => wasmUrl });
      this.laneBlur = this.kit.MaskFilter.MakeBlur(this.kit.BlurStyle.Normal, 24, true);
      this.holdBlur = this.kit.MaskFilter.MakeBlur(this.kit.BlurStyle.Normal, 12, true);
      this.particleBlur = this.kit.MaskFilter.MakeBlur(this.kit.BlurStyle.Normal, 3, true);
      this.resize();
      this.element.dataset.renderer = "skia";
    }).catch((error) => {
      this.disable(error, "Skia 효과 레이어를 시작하지 못해 기본 효과로 계속합니다.");
    });
    return this.loading;
  }

  resize(): void {
    if (this.failed) return;
    const rect = this.element.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.density = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.floor(this.width * this.density);
    const pixelHeight = Math.floor(this.height * this.density);
    if (this.surface && pixelWidth === this.pixelWidth && pixelHeight === this.pixelHeight) return;
    this.pixelWidth = pixelWidth;
    this.pixelHeight = pixelHeight;
    this.surface?.delete?.();
    this.surface = null;
    if (!this.kit) return;
    this.element.width = pixelWidth;
    this.element.height = pixelHeight;
    if (!this.grContext) {
      this.glContextHandle = this.kit.GetWebGLContext(this.element, { antialias: true, alpha: true });
      if (!this.glContextHandle) throw new Error("WebGL context creation failed.");
      this.grContext = this.kit.MakeWebGLContext(this.glContextHandle);
      if (!this.grContext) throw new Error("Skia GPU context creation failed.");
    }
    this.surface = this.kit.MakeOnScreenGLSurface(this.grContext, pixelWidth, pixelHeight, this.kit.ColorSpace.SRGB);
    if (!this.surface) throw new Error("Skia surface creation failed.");
  }

  burst(lane: number): void {
    const amount = this.reducedMotion ? 5 : 18;
    for (let index = 0; index < amount; index += 1) {
      this.particles.push({
        lane,
        angle: -Math.PI + Math.random() * Math.PI,
        speed: 80 + Math.random() * 260,
        age: 0,
        life: 0.42 + Math.random() * 0.42,
        size: 2 + Math.random() * 5,
      });
    }
  }

  render(snapshot: GameSnapshot): void {
    if (!this.kit || !this.surface || this.failed) return;
    try {
      const now = performance.now();
      const delta = Math.min(0.04, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      const kit = this.kit;
      const canvas = this.surface.getCanvas();
      canvas.clear(kit.Color4f(0, 0, 0, 0));
      canvas.save();
      canvas.scale(this.density, this.density);

      const gutter = Math.max(10, Math.min(24, this.width * 0.018));
      const gap = Math.max(4, Math.min(8, this.width * 0.004));
      const laneWidth = (this.width - gutter * 2 - gap * 4) / 5;
      const top = Math.max(62, Math.min(this.height * 0.24, 82));
      const bottom = this.height - Math.max(18, Math.min(34, this.height * 0.035));
      const paint = new kit.Paint();
      paint.setAntiAlias(true);

      snapshot.lanePulse.forEach((pulse, lane) => {
        if (pulse <= 0.02) return;
        const [red, green, blue] = colors[lane];
        const left = gutter + lane * (laneWidth + gap);
        paint.setColor(kit.Color(red, green, blue, Math.min(0.22, pulse * 0.18)));
        paint.setMaskFilter(this.laneBlur);
        canvas.drawRRect(kit.RRectXY(kit.XYWHRect(left + 5, top, laneWidth - 10, bottom - top), 14, 14), paint);
        paint.setMaskFilter(null);
      });

      snapshot.notes.filter((note) => note.holding && !note.completed).forEach((note) => {
        const [red, green, blue] = colors[note.lane];
        const left = gutter + note.lane * (laneWidth + gap);
        const fillHeight = (bottom - top) * Math.max(0.04, note.holdProgress);
        paint.setColor(kit.Color(red, green, blue, 0.16 + note.holdProgress * 0.16));
        paint.setMaskFilter(this.holdBlur);
        canvas.drawRRect(kit.RRectXY(kit.XYWHRect(left + laneWidth * 0.18, bottom - fillHeight, laneWidth * 0.64, fillHeight), 9, 9), paint);
        paint.setMaskFilter(null);
      });

      this.particles = this.particles.filter((particle) => {
        particle.age += delta;
        if (particle.age >= particle.life) return false;
        const progress = particle.age / particle.life;
        const laneCenter = gutter + particle.lane * (laneWidth + gap) + laneWidth / 2;
        const distance = particle.speed * particle.age;
        const x = laneCenter + Math.cos(particle.angle) * distance;
        const y = bottom - 34 + Math.sin(particle.angle) * distance + progress * progress * 70;
        const [red, green, blue] = colors[particle.lane];
        paint.setColor(kit.Color(red, green, blue, 1 - progress));
        paint.setMaskFilter(this.particleBlur);
        canvas.drawCircle(x, y, particle.size * (1 - progress * 0.5), paint);
        paint.setMaskFilter(null);
        return true;
      });

      paint.delete();
      canvas.restore();
      this.surface.flush();
    } catch (error) {
      this.disable(error, "Skia 효과를 중단하고 기본 렌더러로 계속합니다.");
    }
  }

  private disable(error: unknown, message: string): void {
    this.failed = true;
    this.element.dataset.renderer = "fallback";
    this.surface?.delete?.();
    this.surface = null;
    this.laneBlur?.delete?.();
    this.holdBlur?.delete?.();
    this.particleBlur?.delete?.();
    this.laneBlur = null;
    this.holdBlur = null;
    this.particleBlur = null;
    this.grContext?.releaseResourcesAndAbandonContext?.();
    this.grContext?.delete?.();
    this.grContext = null;
    if (this.glContextHandle && this.kit) this.kit.deleteContext(this.glContextHandle);
    this.glContextHandle = 0;
    console.warn(message, error);
  }
}
