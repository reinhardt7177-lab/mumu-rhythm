import { afterEach, describe, expect, it, vi } from "vitest";
import type { Song } from "../types";
import type { AudioEngine } from "./audio";
import { RhythmGame, type GameSnapshot } from "./game";

const song = {
  id: "test", bpm: 120, totalBeats: 20, approachSeconds: 2.5,
  melody: [{ id: "tap", beat: 6, durationBeats: .5, midi: 60, lane: 0, phrase: "a" },
    { id: "hold", beat: 10, durationBeats: 2, midi: 64, lane: 1, phrase: "a" }],
  sections: [{ id: "play", label: "play", startBeat: 0, endBeat: 20, mode: "play" }],
} as Song;

function setup() {
  let nextFrame: FrameRequestCallback;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { nextFrame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const clock = {
    start: vi.fn(async () => 0), stop: vi.fn(), playPop: vi.fn(),
    heardTimeAt: (time: number) => time / 1000, gameNow: 0,
  };
  const onJudge = vi.fn();
  const onFrame = vi.fn<(snapshot: GameSnapshot) => void>();
  const game = new RhythmGame(clock as unknown as AudioEngine, { onJudge, onFrame, onSection: vi.fn(), onComplete: vi.fn() });
  const frame = (time: number) => { clock.gameNow = time; nextFrame(time * 1000); };
  return { game, onJudge, onFrame, frame, pop: clock.playPop };
}

afterEach(() => vi.unstubAllGlobals());

describe("musical hit response", () => {
  const pitched: Song = { ...song, melody: song.melody.map(n => ({ ...n, musicalRole: "lead" })) };
  it("responds immediately with the scored pitch and does not replay it on the hold tail", async () => {
    const { game, pop, frame } = setup();
    await game.start(pitched, "challenge");
    game.pressNote("tap", 3000);
    expect(pop).toHaveBeenLastCalledWith(0, false, 60);
    game.pressNote("hold", 5000);
    expect(pop).toHaveBeenLastCalledWith(1, false, 64);
    frame(6);
    expect(pop).toHaveBeenLastCalledWith(1, false, undefined);
  });
  it("uses percussion rather than an out-of-time pitch for early explore hits", async () => {
    const { game, pop } = setup();
    await game.start(pitched, "explore");
    game.pressNote("tap", 1000);
    expect(pop).toHaveBeenLastCalledWith(0, false, undefined);
  });
  it("uses percussion even for precise hits when pitch was estimated from a recording", async () => {
    const { game, pop } = setup();
    await game.start({ ...pitched, chartSource: "recording" }, "challenge");
    game.pressNote("tap", 3000);
    expect(pop).toHaveBeenLastCalledWith(0, false, undefined);
    game.pressNote("hold", 5000);
    expect(pop).toHaveBeenLastCalledWith(1, false, undefined);
  });
});

describe("direct note input", () => {
  it("accepts an early visible tap in explore, but not challenge", async () => {
    const { game, onJudge } = setup();
    await game.start(song, "explore");
    expect(game.pressNote("tap", 1000)?.kind).toBe("popped");
    expect(onJudge).toHaveBeenCalledOnce();
    await game.start(song, "challenge");
    expect(game.pressNote("tap", 1000)).toBeNull();
    expect(game.pressNote("tap", 3000)?.kind).toBe("popped");
    game.stop();
  });

  it("keeps a long note held until its end even when grabbed early", async () => {
    const { game, onJudge } = setup();
    await game.start(song, "explore");
    expect(game.pressNote("hold", 3000)?.kind).toBe("holding");
    expect(onJudge).not.toHaveBeenCalled();
    expect(game.releaseNote("hold", 5900)).toBe(false);
    expect(onJudge).toHaveBeenCalledOnce();
    expect(onJudge.mock.lastCall?.[0].hold).toBe(true);
    game.stop();
  });
});

describe("challenge timing and holds", () => {
  it("timestamps a hold completion at the current audio frame after a long RAF gap", async () => {
    const {game,onJudge,frame}=setup();
    await game.start(song,"challenge");frame(5);game.pressLane(1,5000);frame(6.1);
    expect(onJudge.mock.calls.find(([event])=>event.noteId==="hold")?.[0]).toMatchObject({hold:true,songTime:6.1});
  });
  it("uses the input audio timestamp, not the most recently rendered frame", async () => {
    const { game, onFrame, onJudge, frame } = setup();
    await game.start(song, "challenge");
    frame(2);
    expect(onFrame.mock.lastCall?.[0].songTime).toBe(2);
    expect(game.pressLane(0, 3000)).toEqual({ kind: "popped", noteId: "tap", judge: "PERFECT" });
    expect(onJudge.mock.lastCall?.[0].judge).toBe("PERFECT");
  });

  it("does not let an already-held head hide the next eligible lane note", async () => {
    const { game } = setup();
    const adjacent = { ...song, melody: [song.melody[1], { ...song.melody[0], beat: 10.5, lane: 1 }] };
    await game.start(adjacent, "challenge");
    expect(game.pressNote("hold", 5000)?.kind).toBe("holding");
    expect(game.pressLane(1, 5100)?.noteId).toBe("tap");
  });

  it("reconnects a released hold before selecting a new nearby head", async () => {
    const { game, onJudge, frame } = setup();
    const adjacent = { ...song, melody: [song.melody[1], { ...song.melody[0], beat: 10.3, lane: 1 }] };
    await game.start(adjacent, "challenge");
    game.pressNote("hold", 5000);
    expect(game.releaseNote("hold", 5100)).toBe(true);
    expect(game.pressLane(1, 5150)?.noteId).toBe("hold");
    frame(6);
    expect(onJudge.mock.calls.filter(([event]) => event.noteId === "hold")).toHaveLength(1);
    expect(onJudge.mock.calls.find(([event]) => event.noteId === "hold")?.[0].judge).toBe("PERFECT");
  });

  it("does not let an expired reconnect hide a valid lane head between frames", async () => {
    const { game } = setup();
    const adjacent = { ...song, melody: [song.melody[1], { ...song.melody[0], beat: 10.3, lane: 1 }] };
    await game.start(adjacent, "challenge");
    game.pressNote("hold", 4900);
    game.releaseNote("hold", 4910);
    expect(game.pressLane(1, 5040)?.noteId).toBe("tap");
  });

  it("does not automatically award a held note before the musical tail", async () => {
    const { game, onJudge, frame } = setup();
    await game.start(song, "challenge");
    game.pressLane(1, 5000);
    frame(5.9);
    expect(onJudge.mock.calls.filter(([event]) => event.noteId === "hold")).toHaveLength(0);
    frame(6);
    frame(6.1);
    expect(onJudge.mock.calls.filter(([event]) => event.noteId === "hold")).toHaveLength(1);
  });

  it("misses an early released hold once, while allowing the tail release grace", async () => {
    const { game, onJudge, frame } = setup();
    await game.start(song, "challenge");
    game.pressNote("hold", 5000);
    expect(game.releaseNote("hold", 5500)).toBe(true);
    frame(5.63);
    frame(6.1);
    expect(onJudge.mock.calls.filter(([event]) => event.noteId === "hold").map(([event]) => event.judge)).toEqual(["MISS"]);
    await game.start(song, "challenge");
    game.pressNote("hold", 5000);
    expect(game.releaseNote("hold", 5900)).toBe(false);
    expect(onJudge.mock.lastCall?.[0].judge).toBe("PERFECT");
  });

  it("processes early explore holds even behind unhit future notes", async () => {
    const { game, onJudge, frame } = setup();
    const early = { ...song, melody: [{ ...song.melody[0], beat: 9 }, song.melody[1]] };
    await game.start(early, "explore");
    game.pressNote("hold", 3000);
    game.releaseNote("hold", 3100);
    frame(3.3);
    expect(onJudge.mock.lastCall?.[0]).toMatchObject({ noteId: "hold", judge: "MISS" });
  });

  it.each(["pressNote", "pressLane"] as const)("%s rejects too-early challenge input identically", async (method) => {
    const { game } = setup();
    await game.start(song, "challenge");
    const press = (time: number) => method === "pressNote" ? game.pressNote("tap", time) : game.pressLane(0, time);
    expect(press(2700)).toBeNull();
    expect(press(3000)?.judge).toBe("PERFECT");
  });

  it.each(["pressNote", "pressLane"] as const)("%s accepts the exact early boundary despite subtraction rounding", async (method) => {
    const { game } = setup();
    await game.start(song, "challenge");
    const result = method === "pressNote" ? game.pressNote("tap", 2800) : game.pressLane(0, 2800);
    expect(result?.judge).toBe("GOOD");
  });
});
