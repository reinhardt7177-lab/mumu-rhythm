/** Render quality presets. Pure so it can be unit tested. */

export type QualitySetting = "auto" | "high" | "mid" | "low";
export type QualityLevel = Exclude<QualitySetting, "auto">;

export interface QualityProfile {
  level: QualityLevel;
  /** Max device pixel ratio for the note canvas. */
  stageDpr: number;
  /** Max device pixel ratio for the MV WebGL canvas (before mvScale). */
  mvDpr: number;
  /** Fraction of the MV canvas resolution actually rendered. */
  mvScale: number;
  /** MV target frame interval in ms (the note canvas always runs every frame). */
  mvFrameMs: number;
  /** Whether the lazy CanvasKit layer is allowed. */
  skia: boolean;
  /** Particle multiplier for hit bursts. */
  particles: number;
  /** Bright flashes allowed per second. */
  flashesPerSecond: number;
}

export interface DeviceHints {
  devicePixelRatio: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  reducedMotion: boolean;
  coarsePointer?: boolean;
}

const PRESETS: Record<QualityLevel, Omit<QualityProfile, "level">> = {
  high: { stageDpr: 2, mvDpr: 1.5, mvScale: 1, mvFrameMs: 0, skia: true, particles: 1, flashesPerSecond: 3 },
  mid: { stageDpr: 2, mvDpr: 1, mvScale: 0.75, mvFrameMs: 1000 / 45, skia: true, particles: 0.65, flashesPerSecond: 3 },
  low: { stageDpr: 1.5, mvDpr: 1, mvScale: 0.5, mvFrameMs: 1000 / 30, skia: false, particles: 0.35, flashesPerSecond: 2 },
};

export function autoQualityLevel(hints: DeviceHints): QualityLevel {
  const cores = hints.hardwareConcurrency ?? 4;
  const memory = hints.deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) return "low";
  if (cores <= 4 || memory <= 4 || hints.coarsePointer) return "mid";
  return "high";
}

export function resolveQuality(setting: QualitySetting, hints: DeviceHints, runtimeLevel?: QualityLevel): QualityProfile {
  const ceiling = setting === "auto" ? autoQualityLevel(hints) : setting;
  // The runtime governor may only lower quality below what the device/user allows.
  const level = runtimeLevel && QUALITY_ORDER.indexOf(runtimeLevel) < QUALITY_ORDER.indexOf(ceiling) ? runtimeLevel : ceiling;
  const preset = PRESETS[level];
  const dpr = Math.max(1, hints.devicePixelRatio || 1);
  return {
    level,
    ...preset,
    stageDpr: Math.min(dpr, preset.stageDpr),
    mvDpr: Math.min(dpr, preset.mvDpr),
    particles: hints.reducedMotion ? Math.min(preset.particles, 0.3) : preset.particles,
    flashesPerSecond: hints.reducedMotion ? 1 : preset.flashesPerSecond,
  };
}

export function parseQualitySetting(value: string | null): QualitySetting {
  return value === "high" || value === "mid" || value === "low" ? value : "auto";
}

// ---------------------------------------------------------------------------
// Runtime adaptive quality
// ---------------------------------------------------------------------------

/** Lowest to highest. */
export const QUALITY_ORDER: readonly QualityLevel[] = ["low", "mid", "high"];

export interface AdaptiveConfig {
  /** Rolling window the slow-frame share is measured over. */
  windowMs: number;
  /** Frames needed in the window before any decision. */
  minSamples: number;
  /** Minimum observed time before any decision, so a brief hitch cannot downshift. */
  minDecisionMs: number;
  /** Share of slow frames in the window that triggers a downshift. */
  downRatio: number;
  /** Share of slow frames that still counts as "healthy" for recovery. */
  upRatio: number;
  /** Time a level must stay healthy before stepping up (grows after flapping). */
  recoverMs: number;
  /** Upper bound for the recovery wait after repeated flapping. */
  maxRecoverMs: number;
  /** A downshift this soon after an upshift doubles the recovery wait. */
  flapMs: number;
  /** Frames right after a change (canvas rebuild stalls) are ignored. */
  cooldownMs: number;
  /** Frames slower than this are always slow (~48 fps). */
  minSlowMs: number;
  /** Slow threshold relative to the measured display refresh interval. */
  refreshSlack: number;
  /** Main-thread render cost that counts as slow even when vsync hides it. */
  workBudgetMs: number;
  /** Gaps longer than this (tab switch, GC, pause) are not performance signals. */
  maxGapMs: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  windowMs: 2000,
  minSamples: 4,
  minDecisionMs: 750,
  downRatio: 0.3,
  upRatio: 0.03,
  recoverMs: 12_000,
  maxRecoverMs: 60_000,
  flapMs: 15_000,
  cooldownMs: 1500,
  minSlowMs: 1000 / 48,
  refreshSlack: 1.45,
  workBudgetMs: 11,
  maxGapMs: 1000,
};

const RING_SIZE = 512;
/** Slowest interval accepted as a display refresh. Sustained sub-48 fps is game-visible lag. */
const MAX_REFRESH_MS = 1000 / 47;

/**
 * Frame-time governor: steps quality down one level after sustained slow frames
 * and cautiously back up after a long healthy stretch. Pure (time is passed in)
 * and allocation-free per sample so it can run every frame and be unit tested.
 *
 * The slow threshold adapts to the display: max(minSlowMs, refresh * slack),
 * where refresh is the fastest interval seen on two consecutive frames. That
 * keeps a 120 Hz panel dropping to 60 Hz from being mistaken for overload,
 * while sustained 30 fps still triggers a downshift for responsive gameplay.
 */
export class AdaptiveQuality {
  private readonly config: AdaptiveConfig;
  private readonly stamps = new Float64Array(RING_SIZE);
  private readonly slow = new Uint8Array(RING_SIZE);
  private head = 0;
  private count = 0;
  private slowCount = 0;
  private currentLevel: QualityLevel;
  private ceilingLevel: QualityLevel;
  private cooldownUntil = -Infinity;
  private healthySince = -Infinity;
  private lastUpshiftAt = -Infinity;
  private recoverWait: number;
  private previousInterval = Infinity;
  private refresh = Infinity;

  constructor(ceiling: QualityLevel, config: Partial<AdaptiveConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.currentLevel = ceiling;
    this.ceilingLevel = ceiling;
    this.recoverWait = this.config.recoverMs;
  }

  get level(): QualityLevel {
    return this.currentLevel;
  }

  get ceiling(): QualityLevel {
    return this.ceilingLevel;
  }

  /** Measured display refresh interval (Infinity until two consecutive frames were seen). */
  get refreshMs(): number {
    return this.refresh;
  }

  get slowThresholdMs(): number {
    return Math.max(this.config.minSlowMs, Number.isFinite(this.refresh) ? this.refresh * this.config.refreshSlack : 0);
  }

  /** Share of slow frames in the current window (0 when empty). */
  get slowRatio(): number {
    return this.count === 0 ? 0 : this.slowCount / this.count;
  }

  /** New device/user ceiling (e.g. the settings changed). Restarts at the ceiling. */
  setCeiling(level: QualityLevel, now: number): void {
    this.ceilingLevel = level;
    this.currentLevel = level;
    this.recoverWait = this.config.recoverMs;
    this.lastUpshiftAt = -Infinity;
    this.reset(now);
  }

  /** Drops the window after a pause, resume, resize or visibility change. Keeps the level. */
  reset(now: number): void {
    this.head = 0;
    this.count = 0;
    this.slowCount = 0;
    this.previousInterval = Infinity;
    this.cooldownUntil = now + this.config.cooldownMs;
    this.healthySince = now;
  }

  /**
   * Feeds one frame. `intervalMs` is the time since the previous frame, `workMs`
   * the main-thread render cost of this frame. Returns the new level when it changes.
   */
  sample(intervalMs: number, workMs: number, now: number): QualityLevel | null {
    const config = this.config;
    if (!(intervalMs > 0) || intervalMs > config.maxGapMs) {
      this.previousInterval = Infinity;
      return null;
    }
    // Two consecutive fast frames bound the vsync period from above. Only real display/browser
    // rates (>= 48 Hz) count. A device that only reaches 30 fps should shed effects.
    const pair = Math.max(intervalMs, this.previousInterval);
    if (pair >= 4 && pair <= MAX_REFRESH_MS && pair < this.refresh) this.refresh = pair;
    this.previousInterval = intervalMs;
    if (now < this.cooldownUntil) return null;

    const isSlow = intervalMs > this.slowThresholdMs || workMs > config.workBudgetMs ? 1 : 0;
    this.push(now, isSlow);
    this.evict(now - config.windowMs);
    const observedMs = this.count > 0 ? now - this.stamps[this.head] : 0;
    if (this.count < config.minSamples || observedMs < config.minDecisionMs) return null;

    const ratio = this.slowCount / this.count;
    if (ratio >= config.downRatio) {
      this.healthySince = now;
      if (this.currentLevel === "low") return null;
      if (now - this.lastUpshiftAt < config.flapMs) {
        this.recoverWait = Math.min(config.maxRecoverMs, this.recoverWait * 2);
      }
      return this.change(QUALITY_ORDER[QUALITY_ORDER.indexOf(this.currentLevel) - 1], now);
    }
    if (ratio > config.upRatio) {
      this.healthySince = now;
      return null;
    }
    if (this.currentLevel !== this.ceilingLevel && now - this.healthySince >= this.recoverWait) {
      this.lastUpshiftAt = now;
      return this.change(QUALITY_ORDER[QUALITY_ORDER.indexOf(this.currentLevel) + 1], now);
    }
    return null;
  }

  private change(level: QualityLevel, now: number): QualityLevel {
    this.currentLevel = level;
    this.reset(now);
    return level;
  }

  private push(now: number, isSlow: number): void {
    if (this.count === RING_SIZE) {
      this.slowCount -= this.slow[this.head];
      this.head = (this.head + 1) % RING_SIZE;
      this.count -= 1;
    }
    const index = (this.head + this.count) % RING_SIZE;
    this.stamps[index] = now;
    this.slow[index] = isSlow;
    this.slowCount += isSlow;
    this.count += 1;
  }

  private evict(before: number): void {
    while (this.count > 0 && this.stamps[this.head] < before) {
      this.slowCount -= this.slow[this.head];
      this.head = (this.head + 1) % RING_SIZE;
      this.count -= 1;
    }
  }
}
