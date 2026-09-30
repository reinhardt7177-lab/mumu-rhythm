import type { Song, SongSection } from "../types";

/**
 * Pure music-to-visual timeline. Every renderer derives its motion from
 * `frameAt(songTime)` where songTime comes from AudioEngine.heardTimeAt, so the
 * MV, the stage and the effects never drift from what the student hears.
 */

export type MvScene = "portal" | "city" | "ribbon" | "listen" | "kaleido";
export const MV_SCENES: readonly MvScene[] = ["portal", "city", "ribbon", "listen", "kaleido"];

export interface SceneSpan {
  scene: MvScene;
  startBeat: number;
  endBeat: number;
  sectionId: string;
}

export interface MelodyPoint {
  /** Seconds until the note reaches the beat line (negative = passed). */
  until: number;
  /** 0 = lowest lane, 1 = highest lane. */
  pitch: number;
}

export interface VisualFrame {
  songTime: number;
  beat: number;
  /** 0..1 inside the current beat; 0 exactly on the beat. */
  beatPhase: number;
  /** 0..1 inside the current bar. */
  barPhase: number;
  /** 1 on the beat, decays exponentially until the next beat. */
  beatPulse: number;
  /** True on downbeats of a bar (for strong accents). */
  downbeat: boolean;
  section: SongSection;
  sectionProgress: number;
  scene: MvScene;
  sceneIndex: number;
  previousScene: MvScene;
  /** 0..1 cross-fade from previousScene into scene. */
  sceneBlend: number;
  /** Local notes per second around now. */
  density: number;
  /** Density normalized against the song's busiest moment, 0..1. */
  energy: number;
  /** Upcoming melody, used to shape the ribbon scene. */
  melody: MelodyPoint[];
  progress: number;
}

export interface SongMotif {
  /** Shader/preview motif id. */
  id: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  /** Five MV colors: warm white, coral, teal, gold, blue ordering. */
  colors: [string, string, string, string, string];
  /** Deep background for the MV panels. */
  night: string;
}

const MOTIFS: Record<string, SongMotif> = {
  "neon-run": { id: 0, name: "circuit", colors: ["#fff4e2", "#ff6f61", "#27c4b4", "#f6c453", "#4f7bff"], night: "#0a1022" },
  "turkish-march": { id: 1, name: "keys", colors: ["#fff1dc", "#f0645a", "#2bb3a3", "#e9b949", "#3d6fd8"], night: "#1b1020" },
  "can-can": { id: 2, name: "frills", colors: ["#fff6e6", "#ff7a6b", "#35c2a0", "#ffd05a", "#5a86ff"], night: "#1a1417" },
  "william-tell": { id: 3, name: "gallop", colors: ["#fdf3df", "#ee6a4e", "#1fa6a8", "#f3c24a", "#2f6ee0"], night: "#0b1a24" },
  "hungarian-dance": { id: 4, name: "spiral", colors: ["#fff0e0", "#e85a70", "#2cb8b0", "#e6b54c", "#5a70e8"], night: "#1c1026" },
  "cloud-hop": { id: 5, name: "clouds", colors: ["#fffaf0", "#ff8fb1", "#5fd4e8", "#ffd97a", "#7f9bff"], night: "#0e1b36" },
  "robot-parade": { id: 6, name: "gears", colors: ["#f4ffe8", "#ff9f43", "#3fd9a2", "#d8f24a", "#5b8cff"], night: "#0f1510" },
};

export function songMotif(songId: string): SongMotif {
  return MOTIFS[songId] ?? MOTIFS["neon-run"];
}

const DENSITY_WINDOW = 1.0;
const TRANSITION_BEATS = 2;
const MELODY_POINTS = 8;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Assigns an MV scene to each song section. Covers all five scenes on every song. */
export function buildSceneSpans(song: Song): SceneSpan[] {
  const sections = song.sections;
  const lastPlayIndex = sections.map((section) => section.mode).lastIndexOf("play");
  let playCount = 0;
  return sections.map((section, index) => {
    let scene: MvScene;
    if (index === 0 && (section.mode === "listen" || section.startBeat <= 0)) scene = "portal";
    else if (section.mode === "listen") scene = "listen";
    else if (index === lastPlayIndex) scene = "kaleido";
    else {
      scene = playCount % 2 === 0 ? "city" : "ribbon";
      playCount += 1;
    }
    return { scene, startBeat: section.startBeat, endBeat: section.endBeat, sectionId: section.id };
  });
}

/** Counts notes whose head time lies in [from, to) using a sorted time array. */
export function countInRange(sortedTimes: readonly number[], from: number, to: number): number {
  return lowerBound(sortedTimes, to) - lowerBound(sortedTimes, from);
}

function lowerBound(values: readonly number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

export class VisualTimeline {
  readonly spans: SceneSpan[];
  readonly peakDensity: number;
  private readonly times: number[];
  private readonly pitches: number[];
  private readonly secondsPerBeat: number;
  private readonly duration: number;

  constructor(private readonly song: Song) {
    this.secondsPerBeat = 60 / song.bpm;
    this.duration = song.totalBeats * this.secondsPerBeat;
    const sorted = [...song.melody].sort((a, b) => a.beat - b.beat);
    this.times = sorted.map((note) => note.beat * this.secondsPerBeat);
    this.pitches = sorted.map((note) => clamp01(note.lane / 4));
    this.spans = buildSceneSpans(song);
    let peak = 0;
    for (let index = 0; index < this.times.length; index += 1) {
      const t = this.times[index];
      peak = Math.max(peak, countInRange(this.times, t - DENSITY_WINDOW, t + DENSITY_WINDOW) / (DENSITY_WINDOW * 2));
    }
    this.peakDensity = Math.max(1, peak);
  }

  densityAt(songTime: number): number {
    return countInRange(this.times, songTime - DENSITY_WINDOW, songTime + DENSITY_WINDOW) / (DENSITY_WINDOW * 2);
  }

  spanAt(beat: number): { span: SceneSpan; index: number } {
    const spans = this.spans;
    for (let index = 0; index < spans.length; index += 1) {
      if (beat < spans[index].endBeat) return { span: spans[index], index: Math.max(0, index) };
    }
    return { span: spans[spans.length - 1], index: spans.length - 1 };
  }

  /**
   * Pure frame for `songTime`. Pass the previous frame as `target` to fill it in
   * place (the render loop reuses one object and its melody array every frame).
   */
  frameAt(songTime: number, target?: VisualFrame): VisualFrame {
    const song = this.song;
    const beat = songTime / this.secondsPerBeat;
    const wholeBeat = Math.floor(beat);
    const beatPhase = beat - wholeBeat;
    const barLength = song.beatsPerBar;
    const barBeat = ((beat % barLength) + barLength) % barLength;
    const { span, index } = this.spanAt(beat);
    const section = song.sections[index] ?? song.sections[song.sections.length - 1];
    const previous = index > 0 ? this.spans[index - 1].scene : span.scene;
    const sceneBlend = index === 0 ? 1 : clamp01((beat - span.startBeat) / TRANSITION_BEATS);
    const spanLength = Math.max(0.001, span.endBeat - span.startBeat);
    const density = this.densityAt(songTime);

    const melody: MelodyPoint[] = target?.melody ?? [];
    let count = 0;
    let cursor = lowerBound(this.times, songTime - 0.25);
    while (count < MELODY_POINTS && cursor < this.times.length) {
      const point = melody[count] ?? (melody[count] = { until: 0, pitch: 0 });
      point.until = this.times[cursor] - songTime;
      point.pitch = this.pitches[cursor];
      count += 1;
      cursor += 1;
    }
    melody.length = count;

    const frame: VisualFrame = target ?? ({} as VisualFrame);
    frame.songTime = songTime;
    frame.beat = beat;
    frame.beatPhase = beat < 0 ? 0 : beatPhase;
    frame.barPhase = barBeat / barLength;
    frame.beatPulse = beat < 0 ? 0 : Math.exp(-beatPhase * 5);
    frame.downbeat = beat >= 0 && Math.floor(barBeat) === 0;
    frame.section = section;
    frame.sectionProgress = clamp01((beat - span.startBeat) / spanLength);
    frame.scene = span.scene;
    frame.sceneIndex = MV_SCENES.indexOf(span.scene);
    frame.previousScene = previous;
    frame.sceneBlend = sceneBlend;
    frame.density = density;
    frame.energy = clamp01(density / this.peakDensity);
    frame.melody = melody;
    frame.progress = clamp01(songTime / this.duration);
    return frame;
  }
}

/**
 * Photosensitivity guard: caps bright flashes to `maxPerSecond` within any
 * rolling one-second window (WCAG 2.3.1 uses three per second).
 */
export class FlashLimiter {
  private stamps: number[] = [];

  constructor(private maxPerSecond = 3) {}

  setLimit(maxPerSecond: number): void {
    this.maxPerSecond = Math.max(0, Math.floor(maxPerSecond));
  }

  /** Returns true if a flash may be shown at `timeSeconds`. */
  request(timeSeconds: number): boolean {
    this.stamps = this.stamps.filter((stamp) => timeSeconds - stamp < 1 && stamp <= timeSeconds);
    if (this.stamps.length >= this.maxPerSecond) return false;
    this.stamps.push(timeSeconds);
    return true;
  }

  reset(): void {
    this.stamps = [];
  }
}

/** Camera shake amplitude for the MV only (the note stage never shakes). */
export function mvShake(frame: Pick<VisualFrame, "beatPulse" | "downbeat" | "energy" | "scene">, reducedMotion: boolean): number {
  if (reducedMotion || frame.scene === "listen") return 0;
  const accent = frame.downbeat ? 1 : 0.45;
  return frame.beatPulse * accent * (0.25 + frame.energy * 0.75);
}
