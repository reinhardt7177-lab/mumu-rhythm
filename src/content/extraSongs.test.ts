import { describe, expect, it } from "vitest";
import { extraSongs, extraSongInfo } from "./extraSongs";

const audio = Object.keys(import.meta.glob("/public/assets/audio/expansion-v3/*.{ogg,m4a}", { query: "?url", import: "default" }))
  .map((path) => path.replace(/^\/public/, ""));

describe("acoustic music expansion v3", () => {
  it("exports exactly eight stable, distinct additions with recording credits", () => {
    expect(extraSongs.map((song) => song.id)).toEqual([
      "bach-prelude", "beethoven-fifth", "morning-mood", "mountain-king",
      "borodin-scherzo", "brahms-tragic", "tchaikovsky-march", "bach-fugue",
    ]);
    expect(Object.keys(extraSongInfo).sort()).toEqual(extraSongs.map((song) => song.id).sort());
    for (const song of extraSongs) {
      const info = extraSongInfo[song.id];
      expect(info.introduction.length).toBeGreaterThan(30);
      expect(info.credit).toContain(info.performer);
      expect(info.sourceUrl).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
      expect(info.licenseUrl).toMatch(/^https:\/\//);
      expect(info.recordingLicense.length).toBeGreaterThan(5);
      expect(info.chartType).toBe("rhythmic-onset");
      expect(info.changes).toContain("excerpt");
      expect(song.mission.options).toHaveLength(3);
      expect(song.mission.options[song.mission.answerIndex]).toBeTruthy();
      expect(audio).toContain(song.backingTrack);
      expect(audio).toContain(song.backingTrackFallback);
      expect(song.totalBeats * 60 / song.bpm).toBeGreaterThanOrEqual(45);
      expect(song.totalBeats * 60 / song.bpm).toBeLessThanOrEqual(90);
    }
  });

  for (let index = 0; index < 8; index++) {
    it(`keeps chart ${index + 1} playable and listening sections free of targets`, () => {
      const song = extraSongs[index];
      expect(song).toBeDefined();
      expect(song.melody.length).toBeGreaterThanOrEqual(35);
      expect([...new Set(song.melody.map((note) => note.lane))].sort()).toEqual([0, 1, 2, 3, 4]);
      expect(song.sections[0].startBeat).toBe(0);
      expect(song.sections.at(-1)!.endBeat).toBe(song.totalBeats);
      song.sections.slice(1).forEach((section, i) => expect(section.startBeat).toBe(song.sections[i].endBeat));
      let previous = -Infinity;
      for (const note of song.melody) {
        expect((note.beat - previous) * 60 / song.bpm).toBeGreaterThanOrEqual(0.309);
        expect(note.durationBeats).toBeGreaterThan(0);
        expect(note.beat + note.durationBeats).toBeLessThanOrEqual(song.totalBeats);
        expect(note.midi).toBe(60); // Compatibility placeholder, never a melody claim.
        const section = song.sections.find((item) => note.beat >= item.startBeat && note.beat < item.endBeat)!;
        expect(section.mode).toBe("play");
        expect(note.beat + note.durationBeats).toBeLessThanOrEqual(section.endBeat);
        previous = note.beat;
      }
    });
  }
});
