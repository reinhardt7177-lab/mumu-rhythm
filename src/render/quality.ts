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

export function resolveQuality(setting: QualitySetting, hints: DeviceHints): QualityProfile {
  const level = setting === "auto" ? autoQualityLevel(hints) : setting;
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
