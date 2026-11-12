import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "./audio";
import type { Song } from "../types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("song previews", () => {
  const song = { id: "preview", backingTrack: "/sample.ogg", leadInBeats: 4, bpm: 120 } as Song;
  function setup() {
    vi.stubGlobal("localStorage", { getItem: () => null });
    const audio = new AudioEngine();
    const source = Object.assign(new EventTarget(), { start: vi.fn(), stop: vi.fn(), connect: vi.fn() });
    Object.assign(audio, {
      context: { currentTime: 5, createBufferSource: () => source }, backingBus: {},
      buffers: new Map([[song.backingTrack, { duration: 60 }]]),
    });
    const preload = vi.spyOn(audio, "preload").mockResolvedValue();
    return { audio, source, preload };
  }

  it("does not start a preview if the selection changes while its audio is loading", async () => {
    const { audio, source, preload } = setup();
    let ready!: () => void;
    preload.mockReturnValue(new Promise<void>(resolve => { ready = resolve; }));
    const request = new AbortController();
    const onEnd = vi.fn();
    const pending = audio.preview(song, { signal: request.signal, onEnd });
    request.abort();
    ready();
    await pending;
    expect(source.start).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("plays the selected excerpt and notifies the control when it ends naturally", async () => {
    const { audio, source } = setup();
    const onEnd = vi.fn();
    await audio.preview(song, { signal: new AbortController().signal, onEnd });
    expect(source.start).toHaveBeenCalledWith(5.08, 2, 12);
    source.dispatchEvent(new Event("ended"));
    source.dispatchEvent(new Event("ended"));
    expect(onEnd).toHaveBeenCalledOnce();
  });
});

describe("audio output clock", () => {
  it.each([undefined, () => ({ contextTime: 0, performanceTime: 0 })])("preserves the input timestamp before output timestamps are available", getOutputTimestamp => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    vi.spyOn(performance, "now").mockReturnValue(2000);
    const audio = new AudioEngine();
    Object.assign(audio, { context: { currentTime: 4, outputLatency: .03, getOutputTimestamp } });
    expect(audio.gameNow).toBeCloseTo(3.97);
    expect(audio.heardTimeAt(1940)).toBeCloseTo(3.91);
  });
});
