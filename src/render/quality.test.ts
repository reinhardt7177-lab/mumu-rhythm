import { describe, expect, it } from "vitest";
import { AdaptiveQuality, resolveQuality, type QualityLevel } from "./quality";

const hints = { devicePixelRatio: 2, hardwareConcurrency: 8, deviceMemory: 8, reducedMotion: false };

/** Feeds `seconds` of frames at a fixed interval and returns every level change with its time. */
function run(governor: AdaptiveQuality, start: number, seconds: number, intervalMs: number, workMs = 3): { now: number; changes: Array<[number, QualityLevel]> } {
  const changes: Array<[number, QualityLevel]> = [];
  let now = start;
  const end = start + seconds * 1000;
  while (now < end) {
    now += intervalMs;
    const change = governor.sample(intervalMs, workMs, now);
    if (change) changes.push([now, change]);
  }
  return { now, changes };
}

/** Feeds frames until the level changes (or `maxSeconds` passes); returns the time of the change. */
function runUntilChange(governor: AdaptiveQuality, start: number, intervalMs: number, maxSeconds = 20): number {
  let now = start;
  while (now < start + maxSeconds * 1000) {
    now += intervalMs;
    if (governor.sample(intervalMs, 3, now)) return now;
  }
  throw new Error("no level change");
}

describe("resolveQuality runtime level", () => {
  it("lets the governor lower but never raise the ceiling", () => {
    expect(resolveQuality("auto", hints).level).toBe("high");
    expect(resolveQuality("auto", hints, "mid").level).toBe("mid");
    expect(resolveQuality("mid", hints, "high").level).toBe("mid");
    expect(resolveQuality("high", hints, "low").skia).toBe(false);
  });
});

describe("AdaptiveQuality", () => {
  it("stays at the ceiling while frames hit a 60 Hz display", () => {
    const governor = new AdaptiveQuality("high");
    expect(run(governor, 0, 30, 1000 / 60).changes).toEqual([]);
    expect(governor.level).toBe("high");
    expect(governor.refreshMs).toBeCloseTo(16.67, 1);
  });

  it("ignores a short burst of slow frames", () => {
    const governor = new AdaptiveQuality("high");
    let { now } = run(governor, 0, 5, 1000 / 60);
    ({ now } = run(governor, now, 0.25, 40)); // ~6 slow frames
    const after = run(governor, now, 5, 1000 / 60);
    expect(after.changes).toEqual([]);
    expect(governor.level).toBe("high");
  });

  it("downshifts one level after sustained slow frames, then keeps stepping down", () => {
    const governor = new AdaptiveQuality("high");
    const { now } = run(governor, 0, 3, 1000 / 60);
    const slow = run(governor, now, 8, 1000 / 28);
    expect(slow.changes.map(([, level]) => level)).toEqual(["mid", "low"]);
    // First decision needs a sustained run, not a single frame.
    expect(slow.changes[0][0] - now).toBeGreaterThan(500);
    // Cooldown separates consecutive downshifts.
    expect(slow.changes[1][0] - slow.changes[0][0]).toBeGreaterThanOrEqual(1500);
  });

  it("never goes below low", () => {
    const governor = new AdaptiveQuality("mid");
    const { changes } = run(governor, 0, 20, 1000 / 20);
    expect(changes.map(([, level]) => level)).toEqual(["low"]);
    expect(governor.level).toBe("low");
  });

  it("treats heavy main-thread work as slow even when vsync looks fine", () => {
    const governor = new AdaptiveQuality("high");
    const { changes } = run(governor, 0, 4, 1000 / 60, 14);
    expect(changes[0]?.[1]).toBe("mid");
  });

  it("does not flag a 120 Hz panel dropping to 60 Hz", () => {
    const fast = new AdaptiveQuality("high");
    let { now } = run(fast, 0, 3, 1000 / 120);
    expect(run(fast, now, 10, 1000 / 60).changes).toEqual([]);
  });

  it("downshifts when gameplay remains at 30 fps", () => {
    const capped = new AdaptiveQuality("high");
    const { changes } = run(capped, 0, 10, 1000 / 30);
    expect(changes.map(([, level]) => level)).toEqual(["mid", "low"]);
  });

  it("ignores long gaps such as tab switches or pauses", () => {
    const governor = new AdaptiveQuality("high");
    let now = 0;
    for (let index = 0; index < 50; index += 1) {
      now += 1500;
      expect(governor.sample(1500, 2, now)).toBeNull();
    }
    expect(governor.level).toBe("high");
  });

  it("still downshifts on a severely overloaded low-fps device", () => {
    const governor = new AdaptiveQuality("high");
    const { changes } = run(governor, 0, 8, 320, 18);
    expect(changes.map(([, level]) => level)).toEqual(["mid", "low"]);
  });

  it("recovers cautiously: only after a long healthy stretch, one level at a time", () => {
    const governor = new AdaptiveQuality("high");
    let { now } = run(governor, 0, 2, 1000 / 60);
    now = runUntilChange(governor, now, 1000 / 28);
    expect(governor.level).toBe("mid");
    const downAt = now;
    const healthy = run(governor, now, 30, 1000 / 60);
    expect(healthy.changes.map(([, level]) => level)).toEqual(["high"]);
    expect(healthy.changes[0][0] - downAt).toBeGreaterThanOrEqual(12_000);
    expect(governor.level).toBe("high");
  });

  it("backs off recovery when the device flaps", () => {
    const governor = new AdaptiveQuality("high");
    let { now } = run(governor, 0, 2, 1000 / 60);
    now = runUntilChange(governor, now, 1000 / 28); // -> mid
    now = runUntilChange(governor, now, 1000 / 60); // -> high after ~12 s
    expect(governor.level).toBe("high");
    now = runUntilChange(governor, now, 1000 / 28); // flaps straight back to mid
    expect(governor.level).toBe("mid");
    const flapAt = now;
    let result = run(governor, now, 20, 1000 / 60);
    expect(result.changes).toEqual([]); // wait doubled to 24 s
    result = run(governor, result.now, 8, 1000 / 60);
    expect(result.changes.map(([, level]) => level)).toEqual(["high"]);
    expect(result.changes[0][0] - flapAt).toBeGreaterThanOrEqual(24_000);
  });

  it("reset clears the window and setCeiling restarts at the new ceiling", () => {
    const governor = new AdaptiveQuality("high");
    let { now } = run(governor, 0, 0.5, 1000 / 28); // too brief to make a decision
    governor.reset(now);
    expect(governor.slowRatio).toBe(0);
    ({ now } = run(governor, now, 1.2, 1000 / 60));
    expect(governor.level).toBe("high");
    governor.setCeiling("mid", now);
    expect(governor.level).toBe("mid");
    expect(governor.ceiling).toBe("mid");
  });

  it("does not allocate per sample (ring buffer holds a bounded window)", () => {
    const governor = new AdaptiveQuality("high", { windowMs: 60_000, minSamples: 10_000 });
    run(governor, 0, 30, 1000 / 144);
    expect(governor.slowRatio).toBe(0);
  });
});
