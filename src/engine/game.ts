import { sectionAt } from "../content/songs";
import { judgeDelta, judgeScore } from "../core/judge";
import { HOLD_NOTE_MIN_BEATS, type GameResult, type JudgeName, type RuntimeNote, type Song, type SongSection } from "../types";
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

export type PressResult = { kind: "popped" | "holding"; noteId: string; judge: Exclude<JudgeName, "MISS"> } | null;

interface GameCallbacks {
  onFrame: (snapshot: GameSnapshot) => void;
  onJudge: (event: JudgeEvent) => void;
  onSection: (section: SongSection) => void;
  onComplete: (result: GameResult) => void;
}

const HOLD_RECONNECT_SECONDS = 0.12;
const HOLD_TAIL_GRACE_SECONDS = 0.15;

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
  private counts = { popped: 0, miss: 0, perfect: 0, great: 0, good: 0 };
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
    this.counts = { popped: 0, miss: 0, perfect: 0, great: 0, good: 0 };
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

  pressNote(noteId: string, performanceTime = performance.now()): PressResult {
    if (!this.running || this.paused || !this.song) return null;
    const note = this.notes.find((item) => item.id === noteId && !item.completed && !item.missed);
    return note ? this.pressCandidate(note, performanceTime) : null;
  }

  pressLane(lane: number, performanceTime = performance.now()): PressResult {
    if (!this.running || this.paused || !this.song) return null;
    const inputTime = this.inputSongTime(performanceTime);
    const secondsPerBeat = 60 / this.song.bpm;
    const candidate = this.notes
      .filter((note) => note.lane === lane && !note.completed && !note.missed)
      .map((note) => ({ note, delta: inputTime - note.beat * secondsPerBeat }))
      .filter(({ note, delta }) => (note.hit && note.holdReleasedAt !== undefined) || judgeDelta(delta) !== null)
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0]?.note;
    return candidate ? this.pressCandidate(candidate, performanceTime) : null;
  }

  releaseNote(noteId: string, performanceTime = performance.now()): boolean {
    if (!this.running || this.paused || !this.song) return false;
    const note = this.notes.find((item) => item.id === noteId && item.holding && !item.completed);
    if (!note) return false;
    const inputTime = this.inputSongTime(performanceTime);
    const endTime = (note.beat + note.durationBeats) * (60 / this.song.bpm);
    note.holding = false;
    if (inputTime >= endTime - HOLD_TAIL_GRACE_SECONDS) {
      this.completeNote(note, note.headJudge ?? "GOOD");
      return false;
    }
    note.holdReleasedAt = inputTime;
    return true;
  }

  private pressCandidate(note: RuntimeNote, performanceTime: number): PressResult {
    if (!this.song) return null;
    const inputTime = this.inputSongTime(performanceTime);
    if (note.hit && note.durationBeats >= HOLD_NOTE_MIN_BEATS && note.holdReleasedAt !== undefined) {
      if (inputTime - note.holdReleasedAt > HOLD_RECONNECT_SECONDS) return null;
      note.holding = true;
      note.holdReleasedAt = undefined;
      this.lanePulse[note.lane] = 1;
      return { kind: "holding", noteId: note.id, judge: note.headJudge ?? "GOOD" };
    }

    if (note.hit) return null;
    const noteTime = note.beat * (60 / this.song.bpm);
    const judge = judgeDelta(inputTime - noteTime);
    if (!judge) return null;
    this.lanePulse[note.lane] = 1;

    if (note.durationBeats >= HOLD_NOTE_MIN_BEATS) {
      note.hit = true;
      note.holding = true;
      note.headJudge = judge;
      note.holdStartedAt = inputTime;
      note.holdReleasedAt = undefined;
      return { kind: "holding", noteId: note.id, judge };
    }

    this.completeNote(note, judge);
    return { kind: "popped", noteId: note.id, judge };
  }

  private completeNote(note: RuntimeNote, judge: Exclude<JudgeName, "MISS">): void {
    if (!this.song || note.completed) return;
    note.hit = true;
    note.completed = true;
    note.holding = false;
    note.holdProgress = 1;
    note.holdStartedAt = undefined;
    note.holdReleasedAt = undefined;
    note.headJudge = judge;
    note.judgedAt = this.songTime();
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.counts.popped += 1;
    this.counts[judge.toLowerCase() as "perfect" | "great" | "good"] += 1;
    const holdBonus = note.durationBeats >= HOLD_NOTE_MIN_BEATS ? Math.min(420, Math.round(note.durationBeats * 95)) : 0;
    const accentBonus = note.accent ? 120 : 0;
    this.score += judgeScore(judge) + holdBonus + accentBonus + Math.min(420, this.combo * 6);
    this.audio.playPop(note.lane, Boolean(note.accent));
    this.callbacks.onJudge({ judge, noteId: note.id, lane: note.lane, score: this.score, combo: this.combo });
  }

  private missNote(note: RuntimeNote): void {
    if (note.completed) return;
    note.missed = true;
    note.completed = true;
    note.holding = false;
    this.combo = 0;
    this.counts.miss += 1;
    this.callbacks.onJudge({ judge: "MISS", noteId: note.id, lane: note.lane, score: this.score, combo: 0 });
  }

  private tick = (): void => {
    if (!this.running || !this.song) return;
    const now = performance.now();
    const delta = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    if (this.paused) {
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }
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
      if (note.completed) return;
      const noteTime = note.beat * secondsPerBeat;
      const endTime = (note.beat + note.durationBeats) * secondsPerBeat;
      if (note.hit && note.durationBeats >= HOLD_NOTE_MIN_BEATS) {
        note.holdProgress = Math.max(0, Math.min(1, (songTime - noteTime) / Math.max(0.01, endTime - noteTime)));
        if (note.holding) {
          this.lanePulse[note.lane] = Math.max(this.lanePulse[note.lane], 0.38 + note.holdProgress * 0.5);
          if (songTime >= endTime - HOLD_TAIL_GRACE_SECONDS) this.completeNote(note, note.headJudge ?? "GOOD");
        } else if (note.holdReleasedAt !== undefined && songTime - note.holdReleasedAt > HOLD_RECONNECT_SECONDS) {
          this.missNote(note);
        }
        return;
      }
      if (!note.hit && songTime > noteTime + 0.2) this.missNote(note);
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

  private inputSongTime(performanceTime: number): number {
    return this.audio.heardTimeAt(performanceTime) - this.startAt;
  }

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
      perfect: this.counts.perfect,
      great: this.counts.great,
      good: this.counts.good,
      stars,
    });
  }
}
