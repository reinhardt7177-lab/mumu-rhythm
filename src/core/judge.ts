import type { JudgeName, PlayMode } from "../types";

export const DEFAULT_APPROACH_SECONDS = 3.2;
const TIMING_EPSILON = 1e-9;

export const JUDGE_WINDOWS = {
  perfect: 0.08,
  great: 0.15,
  earlyGood: 0.42,
  lateGood: 0.2,
} as const;

export function judgeDelta(deltaSeconds: number): Exclude<JudgeName, "MISS"> | null {
  const absolute = Math.abs(deltaSeconds);
  if (absolute <= JUDGE_WINDOWS.perfect + TIMING_EPSILON) return "PERFECT";
  if (absolute <= JUDGE_WINDOWS.great + TIMING_EPSILON) return "GREAT";
  if (deltaSeconds >= -JUDGE_WINDOWS.earlyGood - TIMING_EPSILON && deltaSeconds <= JUDGE_WINDOWS.lateGood + TIMING_EPSILON) return "GOOD";
  return null;
}

/** Direct selection is limited to notes that are actually on the stage. */
export function judgeInput(deltaSeconds: number, mode: PlayMode, approachSeconds: number): Exclude<JudgeName, "MISS"> | null {
  if (!Number.isFinite(deltaSeconds)) return null;
  if (mode === "challenge") return Math.abs(deltaSeconds) <= JUDGE_WINDOWS.lateGood + TIMING_EPSILON ? judgeDelta(deltaSeconds) : null;
  if (deltaSeconds < -approachSeconds - TIMING_EPSILON || deltaSeconds > JUDGE_WINDOWS.lateGood + TIMING_EPSILON) return null;
  return judgeDelta(deltaSeconds) ?? "GOOD";
}

export function judgeScore(judge: Exclude<JudgeName, "MISS">): number {
  if (judge === "PERFECT") return 1_000;
  if (judge === "GREAT") return 820;
  return 620;
}
