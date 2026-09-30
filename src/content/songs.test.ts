import { describe, expect, it } from "vitest";
import { HOLD_NOTE_MIN_BEATS } from "../types";
import { songDurationSeconds, songs } from "./songs";
import { synthTracks } from "./synthCharts.generated";

// Keys only: proves each referenced audio file ships in public/ without loading it.
const shippedAudio = Object.keys(import.meta.glob("/public/assets/audio/**/*.{ogg,m4a}", { query: "?url", import: "default" }))
  .map((path) => path.replace(/^\/public/, ""));

const NEW_SYNTH_IDS = ["cloud-hop", "robot-parade"];

describe("song catalogue", () => {
  it("keeps the five existing songs and adds exactly two original synth songs", () => {
    expect(songs.map((song) => song.id)).toEqual([
      "neon-run", "cloud-hop", "robot-parade", "turkish-march", "can-can", "william-tell", "hungarian-dance",
    ]);
    expect(Object.keys(synthTracks)).toEqual(["neon-run", ...NEW_SYNTH_IDS]);
  });

  it("ships every backing track and fallback", () => {
    for (const song of songs) {
      expect(shippedAudio).toContain(song.backingTrack);
      if (song.backingTrackFallback) expect(shippedAudio).toContain(song.backingTrackFallback);
    }
  });

  it("gives every song a unique palette and mission", () => {
    expect(new Set(songs.map((song) => song.palette.accent)).size).toBe(songs.length);
    expect(new Set(songs.map((song) => song.mission.badge)).size).toBe(songs.length);
    for (const song of songs) expect(song.mission.options[song.mission.answerIndex]).toBeDefined();
  });
});

describe.each(NEW_SYNTH_IDS)("original synth song %s", (id) => {
  const song = songs.find((item) => item.id === id)!;

  it("is at least 45 seconds with OGG + M4A", () => {
    expect(songDurationSeconds(song)).toBeGreaterThanOrEqual(45);
    expect(song.backingTrack).toMatch(new RegExp(`/${id}\\.ogg$`));
    expect(song.backingTrackFallback).toMatch(new RegExp(`/${id}\\.m4a$`));
  });

  it("has playable five-lane notes with holds and no same-lane overlap", () => {
    const lanes = new Set(song.melody.map((note) => note.lane));
    expect([...lanes].sort()).toEqual([0, 1, 2, 3, 4]);
    const holds = song.melody.filter((note) => note.durationBeats >= HOLD_NOTE_MIN_BEATS);
    expect(holds.length).toBeGreaterThanOrEqual(4);
    const laneFree = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
    let previousBeat = -Infinity;
    for (const note of song.melody) {
      expect(note.beat).toBeGreaterThanOrEqual(previousBeat);
      expect(note.beat).toBeGreaterThanOrEqual(laneFree[note.lane]);
      expect(note.beat + note.durationBeats).toBeLessThanOrEqual(song.totalBeats);
      laneFree[note.lane] = note.beat + (note.durationBeats >= HOLD_NOTE_MIN_BEATS ? note.durationBeats : 0.25);
      previousBeat = note.beat;
    }
  });

  it("has contiguous play/listen sections and keeps listening breaks note-free", () => {
    const sections = song.sections;
    expect(sections[0].startBeat).toBe(0);
    expect(sections.at(-1)!.endBeat).toBe(song.totalBeats);
    sections.slice(1).forEach((section, index) => expect(section.startBeat).toBe(sections[index].endBeat));
    for (const section of sections.filter((item) => item.mode === "listen")) {
      expect(song.melody.some((note) => note.beat >= section.startBeat && note.beat < section.endBeat)).toBe(false);
    }
  });
});

describe("Neon Run regeneration", () => {
  it("keeps its id, tempo and 344-note chart", () => {
    const neon = songs.find((song) => song.id === "neon-run")!;
    expect(neon.bpm).toBe(150);
    expect(neon.melody).toHaveLength(344);
    expect(neon.backingTrack).toBe("/assets/audio/v5/synth/neon-run.ogg");
  });
});
