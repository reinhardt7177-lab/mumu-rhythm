import { HOLD_NOTE_MIN_BEATS, type GameResult, type JudgeName, type RuntimeNote, type Song, type SongSection } from "../types";
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
  noteId: string;
  lane: number;
  score: number;
  combo: number;
}

export type PressResult = "popped" | "holding" | null;

interface GameCallbacks {
  onFrame: (snapshot: GameSnapshot) => void;
  onJudge: (event: JudgeEvent) => void;
  onSection: (section: SongSection) => void;
  onComplete: (result: GameResult) => void;
}

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
  private counts = { popped: 0, miss: 0 };
  private lanePulse = [0, 0, 0, 0, 0];
  private lastFrameTime = performance.now();
  private currentSectionId = "";

  constructor(
    private audio: AudioEngine,
    private callbacks: GameCallbacks,
  ) {}

  async start(song: Song): Promise<void> {
    this.stop();
    this.song = song;
    this.notes = song.melody.map((note) => ({
      ...note,
      hit: false,
      missed: false,
      completed: false,
      holding: false,
      holdProgress: 0,
    }));
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { popped: 0, miss: 0 };
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

  pressNote(noteId: string): PressResult {
    if (!this.running || this.paused || !this.song) return null;
    const note = this.notes.find((item) => item.id === noteId && !item.hit && !item.missed);
    if (!note) return null;

    this.lanePulse[note.lane] = 1;
    if (note.durationBeats >= HOLD_NOTE_MIN_BEATS) {
      if (note.holding) return null;
      note.holding = true;
      note.holdProgress = 0;
      note.holdStartedAt = this.songTime();
      return "holding";
    }

    this.completeNote(note);
    return "popped";
  }

  releaseNote(noteId: string): boolean {
    if (!this.running || !this.song) return false;
    const note = this.notes.find((item) => item.id === noteId && item.holding && !item.completed);
    if (!note) return false;
    if (note.holdProgress >= 0.88) {
      this.completeNote(note);
      return false;
    }
    note.holding = false;
    note.holdProgress = 0;
    note.holdStartedAt = undefined;
    return true;
  }

  private completeNote(note: RuntimeNote): void {
    if (!this.song || note.completed) return;
    note.hit = true;
    note.completed = true;
    note.holding = false;
    note.holdProgress = 1;
    note.holdStartedAt = undefined;
    note.judgedAt = this.songTime();
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.counts.popped += 1;
    const lengthBonus = Math.min(240, Math.round(note.durationBeats * 70));
    const accentBonus = note.accent ? 180 : 0;
    this.score += 600 + lengthBonus + accentBonus + Math.min(500, this.combo * 7);
    this.audio.playPop(note.lane, Boolean(note.accent));
    this.callbacks.onJudge({
      judge: "POP",
      noteId: note.id,
      lane: note.lane,
      score: this.score,
      combo: this.combo,
    });
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
      if (note.holding && note.holdStartedAt !== undefined) {
        const musicalDuration = note.durationBeats * secondsPerBeat;
        const requiredSeconds = Math.max(0.65, Math.min(1.25, musicalDuration * 0.82));
        note.holdProgress = Math.max(0, Math.min(1, (songTime - note.holdStartedAt) / requiredSeconds));
        this.lanePulse[note.lane] = Math.max(this.lanePulse[note.lane], 0.38 + note.holdProgress * 0.5);
        if (note.holdProgress >= 1) this.completeNote(note);
      }
      if (!note.hit && !note.missed && !note.holding && songTime > noteTime + 0.22) {
        note.missed = true;
        note.completed = true;
        this.combo = 0;
        this.counts.miss += 1;
        this.callbacks.onJudge({ judge: "MISS", noteId: note.id, lane: note.lane, score: this.score, combo: this.combo });
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
    return this.audio.gameNow - this.startAt;
  }

  private finish(): void {
    if (!this.song) return;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    const total = this.notes.length || 1;
    const accuracy = Math.round((this.counts.popped / total) * 100);
    const stars = accuracy >= 85 ? 3 : accuracy >= 60 ? 2 : 1;
    this.callbacks.onComplete({
      songId: this.song.id,
      score: this.score,
      accuracy,
      maxCombo: this.maxCombo,
      popped: this.counts.popped,
      miss: this.counts.miss,
      stars,
    });
  }
}
