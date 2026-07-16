import type { GameResult, JudgeName, RuntimeNote, Song, SongSection } from "../types";
import { sectionAt } from "../content/songs";
import { AudioEngine } from "./audio";

export interface GameSnapshot {
  song: Song;
  songTime: number;
  beat: number;
  notes: RuntimeNote[];
  section: SongSection;
  score: number;
  combo: number;
  progress: number;
  lanePulse: number[];
  paused: boolean;
}

export interface JudgeEvent {
  judge: JudgeName;
  lane: number;
  deltaMs: number;
  score: number;
  combo: number;
}

interface GameCallbacks {
  onFrame: (snapshot: GameSnapshot) => void;
  onJudge: (event: JudgeEvent) => void;
  onFeedback: (message: string) => void;
  onSection: (section: SongSection) => void;
  onComplete: (result: GameResult) => void;
}

const windows = {
  perfect: 0.07,
  great: 0.13,
  good: 0.2,
};

export class RhythmGame {
  private song: Song | null = null;
  private notes: RuntimeNote[] = [];
  private startAt = 0;
  private frameId = 0;
  private running = false;
  private paused = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private counts = { perfect: 0, great: 0, good: 0, miss: 0 };
  private lanePulse = [0, 0, 0, 0, 0];
  private lastFrameTime = performance.now();
  private currentSectionId = "";
  private timingOffsetMs = 0;

  constructor(
    private audio: AudioEngine,
    private callbacks: GameCallbacks,
  ) {}

  setTimingOffset(milliseconds: number): void {
    this.timingOffsetMs = Math.max(-180, Math.min(180, milliseconds));
  }

  async start(song: Song): Promise<void> {
    this.stop();
    this.song = song;
    this.notes = song.melody.map((note) => ({
      ...note,
      hit: false,
      missed: false,
      holding: false,
      completed: false,
    }));
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.lanePulse = [0, 0, 0, 0, 0];
    this.currentSectionId = "";
    this.paused = false;
    this.startAt = await this.audio.start(song);
    this.running = true;
    this.lastFrameTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    cancelAnimationFrame(this.frameId);
    this.audio.stop();
  }

  async togglePause(): Promise<boolean> {
    if (!this.running) return false;
    this.paused = !this.paused;
    if (this.paused) await this.audio.suspend();
    else await this.audio.resume();
    return this.paused;
  }

  laneDown(lane: number): void {
    if (!this.running || this.paused || !this.song) return;
    this.lanePulse[lane] = 1;
    const time = this.songTime();
    const secondsPerBeat = 60 / this.song.bpm;
    const candidates = this.notes
      .filter((note) => note.lane === lane && !note.hit && !note.missed)
      .map((note) => ({ note, delta: note.beat * secondsPerBeat - time }))
      .filter((candidate) => Math.abs(candidate.delta) <= windows.good)
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

    const candidate = candidates[0];
    if (!candidate) {
      const next = this.notes.find((note) => note.lane === lane && !note.hit && !note.missed && note.beat * secondsPerBeat > time);
      if (next && next.beat * secondsPerBeat - time < 0.42) this.callbacks.onFeedback("조금만 기다려요");
      this.audio.playUi("soft");
      return;
    }

    const absoluteDelta = Math.abs(candidate.delta);
    let judge: JudgeName;
    let points: number;
    if (absoluteDelta <= windows.perfect) {
      judge = "PERFECT";
      points = 1000;
      this.counts.perfect += 1;
    } else if (absoluteDelta <= windows.great) {
      judge = "GREAT";
      points = 720;
      this.counts.great += 1;
    } else {
      judge = "GOOD";
      points = 460;
      this.counts.good += 1;
    }

    candidate.note.hit = true;
    candidate.note.judgedAt = time;
    candidate.note.holding = candidate.note.durationBeats >= 1.75;
    candidate.note.completed = !candidate.note.holding;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += points + Math.min(400, this.combo * 8);
    this.audio.playHit(candidate.note.midi, this.song.soundWorld, judge === "PERFECT" ? 1.05 : 0.88);
    this.callbacks.onJudge({
      judge,
      lane,
      deltaMs: candidate.delta * 1000,
      score: this.score,
      combo: this.combo,
    });
  }

  laneUp(lane: number): void {
    if (!this.running || this.paused || !this.song) return;
    const held = this.notes.find((note) => note.lane === lane && note.holding && !note.completed);
    if (!held) return;
    const secondsPerBeat = 60 / this.song.bpm;
    const elapsed = this.songTime() - held.beat * secondsPerBeat;
    const required = held.durationBeats * secondsPerBeat;
    held.holding = false;
    held.completed = true;
    if (elapsed >= required * 0.72) {
      this.score += 360;
      this.callbacks.onFeedback("긴 음을 끝까지 잘 들었어요");
    } else {
      this.callbacks.onFeedback("긴 음은 조금 더 이어 보세요");
    }
  }

  private tick = (): void => {
    if (!this.running || !this.song) return;
    const now = performance.now();
    const delta = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    this.lanePulse = this.lanePulse.map((value) => Math.max(0, value - delta * 4.8));

    const songTime = this.songTime();
    const secondsPerBeat = 60 / this.song.bpm;
    const beat = songTime / secondsPerBeat;
    const section = sectionAt(this.song, beat);

    if (section.id !== this.currentSectionId) {
      this.currentSectionId = section.id;
      this.callbacks.onSection(section);
    }

    this.notes.forEach((note) => {
      const noteTime = note.beat * secondsPerBeat;
      if (!note.hit && !note.missed && songTime > noteTime + windows.good) {
        note.missed = true;
        note.completed = true;
        this.combo = 0;
        this.counts.miss += 1;
        this.callbacks.onJudge({ judge: "MISS", lane: note.lane, deltaMs: 0, score: this.score, combo: this.combo });
      }

      if (note.holding && !note.completed) {
        const noteEnd = noteTime + note.durationBeats * secondsPerBeat;
        if (songTime >= noteEnd - 0.08) {
          note.holding = false;
          note.completed = true;
          this.score += 420;
          this.callbacks.onFeedback("긴 음이 예쁘게 이어졌어요");
        }
      }
    });

    const duration = this.song.totalBeats * secondsPerBeat;
    const progress = Math.max(0, Math.min(1, songTime / duration));
    this.callbacks.onFrame({
      song: this.song,
      songTime,
      beat,
      notes: this.notes,
      section,
      score: this.score,
      combo: this.combo,
      progress,
      lanePulse: this.lanePulse,
      paused: this.paused,
    });

    if (songTime >= duration + 0.25) {
      this.finish();
      return;
    }
    this.frameId = requestAnimationFrame(this.tick);
  };

  private songTime(): number {
    return this.audio.gameNow - this.startAt + this.timingOffsetMs / 1000;
  }

  private finish(): void {
    if (!this.song) return;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    const total = this.notes.length || 1;
    const weighted = this.counts.perfect + this.counts.great * 0.78 + this.counts.good * 0.5;
    const accuracy = Math.round((weighted / total) * 100);
    const stars = accuracy >= 88 ? 3 : accuracy >= 68 ? 2 : 1;
    this.callbacks.onComplete({
      songId: this.song.id,
      score: this.score,
      accuracy,
      maxCombo: this.maxCombo,
      perfect: this.counts.perfect,
      great: this.counts.great,
      good: this.counts.good,
      miss: this.counts.miss,
      stars,
    });
  }
}
