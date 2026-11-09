import { DEFAULT_APPROACH_SECONDS, JUDGE_WINDOWS } from "../core/judge";
import { HOLD_NOTE_MIN_BEATS, type RuntimeNote } from "../types";

export const TRACK = {
  width: 240, height: 360, lanes: 5, laneWidth: 48,
  hitlineY: 330, travel: 310, headWidth: 38, headHeight: 10,
} as const;

export function trackY(until: number, approach: number): number {
  return TRACK.hitlineY - until / approach * TRACK.travel;
}

export function noteGeometry(note: RuntimeNote, songTime: number, secondsPerBeat: number, approach = DEFAULT_APPROACH_SECONDS) {
  if (note.completed || note.missed) return null;
  const until = note.beat * secondsPerBeat - songTime;
  const hold = note.durationBeats >= HOLD_NOTE_MIN_BEATS;
  const tailUntil = until + note.durationBeats * secondsPerBeat;
  if (until > approach || (hold ? tailUntil : until) < -JUDGE_WINDOWS.lateGood) return null;
  const rawY = trackY(until, approach);
  const x = (note.lane + .5) * TRACK.laneWidth;
  const y = Math.round(hold && note.hit ? Math.min(TRACK.hitlineY, rawY) : rawY);
  const head = { x: x - TRACK.headWidth / 2, y: y - TRACK.headHeight / 2, width: TRACK.headWidth, height: TRACK.headHeight };
  const tailY = Math.max(0, trackY(tailUntil, approach));
  const body = hold ? { x: head.x + 6, y: tailY, width: 26, height: Math.max(0, y - tailY) } : null;
  return { x, y, head, body };
}
