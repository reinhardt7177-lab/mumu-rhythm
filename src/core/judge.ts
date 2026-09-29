import type { JudgeName } from "../types";

export const JUDGE_WINDOWS = {
  perfect: 0.08,
  great: 0.15,
  earlyGood: 0.42,
  lateGood: 0.2,
} as const;

export function judgeDelta(deltaSeconds: number): Exclude<JudgeName, "MISS"> | null {
  const absolute = Math.abs(deltaSeconds);
  if (absolute <= JUDGE_WINDOWS.perfect) return "PERFECT";
  if (absolute <= JUDGE_WINDOWS.great) return "GREAT";
  if (deltaSeconds >= -JUDGE_WINDOWS.earlyGood && deltaSeconds <= JUDGE_WINDOWS.lateGood) return "GOOD";
  return null;
}

export function judgeScore(judge: Exclude<JudgeName, "MISS">): number {
  if (judge === "PERFECT") return 1_000;
  if (judge === "GREAT") return 820;
  return 620;
}
