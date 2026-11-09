import { describe, expect, it } from 'vitest';
import { songs } from '../content/songs';
import { WORLDS, songForWorld, questionsFor } from './worlds';

describe('musical worlds', () => {
  it('offers four eras with distinct music and art', () => {
    expect(WORLDS.map(w=>w.id)).toEqual(['past','present','future','fantasy']);
    expect(new Set(WORLDS.map(w=>w.songId)).size).toBe(4);
    expect(new Set(WORLDS.map(w=>w.background)).size).toBe(4);
    for(const world of WORLDS) {
      const song=songForWorld(world.id);
      expect(song.id).toBe(world.songId);
      expect(song.melody.length).toBeGreaterThan(30);
      expect(world.introduction.length).toBeGreaterThan(25);
      expect(world.stops).toHaveLength(4);
    }
  });
  it('uses the selected song for the listening question', () => {
    for(const world of WORLDS){const song=songForWorld(world.id),q=questionsFor(song)[0];expect(q.q).toBe(song.mission.question);expect(q.a[q.correct]).toBe(song.mission.options[song.mission.answerIndex]);}
  });
  it('does not leak Can-Can theory into original synth lessons', () => {
    const song=songForWorld('future');
    expect(questionsFor(song)[0].why).toBe(song.mission.hint);
    expect(questionsFor(song).some(q=>q.q.includes('캉캉'))).toBe(false);
    expect(songs.find(s=>s.id==='neon-run')).toBe(song);
  });
  it('rejects unknown world IDs instead of silently playing a different song', () => {
    expect(()=>songForWorld('unknown')).toThrow('Unknown world');
  });
});
