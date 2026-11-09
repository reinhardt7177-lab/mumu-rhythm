import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameSnapshot } from "../engine/game";
import { NoteTrack } from "./noteTrack";

function setup() {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const rectangles: { color: string; x: number; y: number; width: number; height: number }[] = [];
  const context = {
    fillStyle: "", globalAlpha: 1, imageSmoothingEnabled: false,
    setTransform: vi.fn(),
    fillRect(x: number, y: number, width: number, height: number) {
      rectangles.push({ color: this.fillStyle, x, y, width, height });
    },
  };
  const canvas = {
    width: 240, height: 360, getContext: () => context,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 480, height: 720 }),
  } as unknown as HTMLCanvasElement;
  const buttons = Array.from({ length: 5 }, () => ({ classList: { toggle() {}, remove() {} } })) as unknown as HTMLButtonElement[];
  const label = { textContent: "", style:{}, animate: vi.fn() } as unknown as HTMLElement;
  const track = new NoteTrack(canvas, buttons, label);
  const snapshot = {
    song: { bpm: 120, beatsPerBar: 4, approachSeconds: 3.2 }, songTime: 3, beat: 6,
    notes: [{ id: "tap", beat: 6, durationBeats: .5, lane: 0, hit: false, holding: false, completed: false }],
    lanePulse: [0, 0, 0, 0, 0],
  } as GameSnapshot;
  return { track, snapshot, rectangles, canvas, context, label };
}

afterEach(() => vi.unstubAllGlobals());

describe("note track geometry", () => {
  it("lights an empty pressed lane without a successful judgment or score pulse",()=>{
    const{track,snapshot,rectangles}=setup();snapshot.notes=[];
    track.press(3,'KeyJ');track.draw(snapshot,'challenge');
    expect(rectangles.some(r=>r.color==='#b8e491'&&r.x===146&&r.width===44&&r.height===5)).toBe(true);
    track.clearInput();rectangles.length=0;track.draw(snapshot,'challenge');
    expect(rectangles.some(r=>r.width===44&&r.height===5)).toBe(false);
  });
  it("suppresses both held-input and successful-note illumination in a paused frame",()=>{
    const{track,snapshot,rectangles}=setup();snapshot.notes=[];snapshot.lanePulse=[1,1,1,1,1];snapshot.paused=true;
    track.press(0,'KeyA');track.draw(snapshot,'challenge');
    expect(rectangles.some(r=>r.width===44&&r.height===5)).toBe(false);
  });
  it("centers the rendered head and its selectable target on the music hitline", () => {
    const { track, snapshot, rectangles } = setup();
    track.draw(snapshot, "challenge");
    const head = rectangles.find(r => r.color === "#81e6d0" && r.width === 38)!;
    expect(head.x + head.width / 2).toBe(24);
    expect(head.y + head.height / 2).toBe(330);
    expect(track.targetAt(58, 680)).toMatchObject({ id: "tap", x: 24, y: 330 });
  });

  it("never selects a neighbouring lane through touch padding", () => {
    const { track, snapshot } = setup();
    track.draw(snapshot, "challenge");
    expect(track.targetAt(106, 680)).toBeUndefined();
  });

  it.each([0, 1, 2, 3, 4])("aligns lane %i to its key center before, on and after the beat", (lane) => {
    const { track, snapshot } = setup();
    snapshot.notes[0].lane = lane;
    snapshot.song.approachSeconds = 3.1;
    const clientX = 10 + (lane * 48 + 24) * 2;
    for (const [time, y] of [[2, 230], [3, 330], [3.1, 340]]) {
      snapshot.songTime = time;
      track.draw(snapshot, "challenge");
      expect(track.targetAt(clientX, 20 + y * 2)).toEqual({ id: "tap", lane, x: lane * 48 + 24, y });
    }
  });

  it("does not select hidden canvases or points outside the track", () => {
    const { track, snapshot, canvas } = setup();
    track.draw(snapshot, "challenge");
    expect(track.targetAt(9, 680)).toBeUndefined();
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    expect(track.targetAt(0, 0)).toBeUndefined();
  });

  it("uses the same 3.2 second default approach as explore input", () => {
    const { track, snapshot } = setup();
    snapshot.song.approachSeconds = undefined;
    snapshot.songTime = 0;
    snapshot.beat = 0;
    snapshot.notes[0].beat = 6.2;
    track.draw(snapshot, "explore");
    expect(track.targetAt(58, 80)?.id).toBe("tap");
  });

  it("does not return a consumed note from the last drawn frame", () => {
    const { track, snapshot } = setup();
    track.draw(snapshot, "challenge");
    snapshot.notes[0].completed = true;
    expect(track.targetAt(58, 680)).toBeUndefined();
  });

  it("pins an active hold center to the line and keeps its tail above it", () => {
    const { track, snapshot, rectangles } = setup();
    Object.assign(snapshot.notes[0], { durationBeats: 2, hit: true, holding: true });
    snapshot.songTime = 3.5;
    snapshot.beat = 7;
    track.draw(snapshot, "challenge");
    expect(track.targetAt(58, 680)?.y).toBe(330);
    const body = rectangles.find(r => r.color === "#81e6d066")!;
    expect(body.y).toBeLessThan(330);
    expect(body.y + body.height).toBe(330);
  });

  it("scales the logical track to the backing canvas without changing input coordinates", () => {
    const { track, snapshot, canvas, context } = setup();
    canvas.width = 480;
    canvas.height = 720;
    track.draw(snapshot, "challenge");
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(track.targetAt(58, 680)?.id).toBe("tap");
  });

  it("shows the judgment line and does not celebrate misses as combo bursts", () => {
    const { track, snapshot, rectangles, label } = setup();
    track.draw(snapshot, "challenge");
    expect(rectangles.some(r => r.color === "#ffe39a" && r.x === 0 && r.width === 240 && r.y <= 330 && r.y + r.height >= 330)).toBe(true);
    track.feedback({ judge: "MISS", noteId: "tap", lane: 0, score: 0, combo: 0 }, 3);
    expect(label.textContent).toBe("MISS");
  });
});
