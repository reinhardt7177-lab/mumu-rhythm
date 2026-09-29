import { describe, expect, it } from "vitest";
import { songs } from "../content/songs";
import type { Song } from "../types";
import { FlashLimiter, MV_SCENES, VisualTimeline, buildSceneSpans, countInRange, mvShake, songMotif } from "./visualTimeline";

function fixture(): Song {
  const base = songs[0];
  return {
    ...base,
    bpm: 120,
    beatsPerBar: 4,
    totalBeats: 64,
    melody: [0, 1, 2, 3, 16, 16.5, 17, 40].map((beat, index) => ({
      id: `n${index}`,
      beat,
      durationBeats: 0.5,
      midi: 60 + index,
      lane: index % 5,
      phrase: "p",
    })),
    sections: [
      { id: "intro", label: "시작", startBeat: 0, endBeat: 8, mode: "listen" },
      { id: "a", label: "A", startBeat: 8, endBeat: 24, mode: "play" },
      { id: "calm", label: "감상", startBeat: 24, endBeat: 32, mode: "listen" },
      { id: "b", label: "B", startBeat: 32, endBeat: 48, mode: "play" },
      { id: "finale", label: "피날레", startBeat: 48, endBeat: 64, mode: "play" },
    ],
  };
}

describe("buildSceneSpans", () => {
  it("maps sections to portal, city, listen, ribbon and kaleido", () => {
    expect(buildSceneSpans(fixture()).map((span) => span.scene)).toEqual(["portal", "city", "listen", "ribbon", "kaleido"]);
  });

  it("covers all five MV scenes for every shipped song", () => {
    for (const song of songs) {
      const scenes = new Set(buildSceneSpans(song).map((span) => span.scene));
      expect([...scenes].sort()).toEqual([...MV_SCENES].sort());
    }
  });
});

describe("VisualTimeline.frameAt", () => {
  const timeline = new VisualTimeline(fixture());

  it("derives beat phase and pulse from song time", () => {
    const onBeat = timeline.frameAt(2.0);
    expect(onBeat.beat).toBeCloseTo(4);
    expect(onBeat.beatPhase).toBeCloseTo(0);
    expect(onBeat.beatPulse).toBeCloseTo(1);
    expect(onBeat.downbeat).toBe(true);
    const offBeat = timeline.frameAt(2.25);
    expect(offBeat.beatPhase).toBeCloseTo(0.5);
    expect(offBeat.beatPulse).toBeLessThan(0.2);
    expect(offBeat.barPhase).toBeCloseTo(0.125);
  });

  it("is deterministic for the same time", () => {
    expect(timeline.frameAt(9.37)).toEqual(timeline.frameAt(9.37));
  });

  it("switches scenes at section boundaries and cross-fades over two beats", () => {
    const start = timeline.frameAt(4.0); // beat 8
    expect(start.scene).toBe("city");
    expect(start.previousScene).toBe("portal");
    expect(start.sceneBlend).toBeCloseTo(0);
    expect(timeline.frameAt(4.5).sceneBlend).toBeCloseTo(0.5);
    expect(timeline.frameAt(5.0).sceneBlend).toBe(1);
    expect(timeline.frameAt(12.5).scene).toBe("listen");
    expect(timeline.frameAt(20).scene).toBe("ribbon");
    expect(timeline.frameAt(30).scene).toBe("kaleido");
    expect(timeline.frameAt(999).scene).toBe("kaleido");
  });

  it("reports density, normalized energy and progress", () => {
    const busy = timeline.frameAt(8.25); // beats 16..17 cluster
    const quiet = timeline.frameAt(15);
    expect(busy.density).toBeGreaterThan(quiet.density);
    expect(busy.energy).toBeGreaterThan(0.5);
    expect(busy.energy).toBeLessThanOrEqual(1);
    expect(quiet.energy).toBe(0);
    expect(timeline.frameAt(0).progress).toBe(0);
    expect(timeline.frameAt(16).progress).toBeCloseTo(0.5);
    expect(timeline.frameAt(100).progress).toBe(1);
  });

  it("lists upcoming melody points in time order", () => {
    const frame = timeline.frameAt(7.9);
    expect(frame.melody.length).toBeGreaterThan(0);
    expect(frame.melody[0].until).toBeCloseTo(0.1);
    for (let index = 1; index < frame.melody.length; index += 1) {
      expect(frame.melody[index].until).toBeGreaterThan(frame.melody[index - 1].until);
    }
    frame.melody.forEach((point) => {
      expect(point.pitch).toBeGreaterThanOrEqual(0);
      expect(point.pitch).toBeLessThanOrEqual(1);
    });
  });

  it("stays calm before the song starts", () => {
    const frame = timeline.frameAt(-1);
    expect(frame.beatPulse).toBe(0);
    expect(frame.downbeat).toBe(false);
    expect(frame.scene).toBe("portal");
  });
});

describe("helpers", () => {
  it("counts sorted times in half-open ranges", () => {
    expect(countInRange([0, 1, 1, 2, 3], 1, 3)).toBe(3);
    expect(countInRange([], 0, 10)).toBe(0);
  });

  it("limits flashes to three per rolling second", () => {
    const limiter = new FlashLimiter(3);
    expect([0, 0.1, 0.2, 0.3].map((t) => limiter.request(t))).toEqual([true, true, true, false]);
    expect(limiter.request(1.05)).toBe(true);
  });

  it("disables MV shake for reduced motion and the listening scene", () => {
    const frame = { beatPulse: 1, downbeat: true, energy: 1, scene: "city" as const };
    expect(mvShake(frame, false)).toBeGreaterThan(0);
    expect(mvShake(frame, true)).toBe(0);
    expect(mvShake({ ...frame, scene: "listen" }, false)).toBe(0);
  });

  it("gives every song a distinct motif", () => {
    const ids = songs.map((song) => songMotif(song.id).id);
    expect(new Set(ids).size).toBe(songs.length);
  });
});
