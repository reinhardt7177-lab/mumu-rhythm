import { describe, expect, it } from 'vitest';
import { buildLevelChart, type SourceEvent } from './levelChart';
import { songs } from './songs';

const song = { ...songs[0], bpm: 120, beatsPerBar: 4 as const, leadInBeats: 4, totalBeats: 24,
  sections: [{ id: 'play', label: 'Play', startBeat: 4, endBeat: 20, mode: 'play' as const },
    { id: 'listen', label: 'Listen', startBeat: 20, endBeat: 24, mode: 'listen' as const }] };
const events: SourceEvent[] = [
  [4.07, .4, null, 'pulse'], [4.4, .2, 64, 'lead'], [5.1, .4, 46, 'bass'], [5.67, .3, 69, 'lead'],
  [6.17, .2, null, 'rhythm'], [6.67, .4, 78, 'lead'], [7.5, .4, 62, 'lead'], [8.12, .3, null, 'pulse'],
  [9.13, .3, 54, 'bass'], [10.3, 2, 74, 'lead'], [11, .3, 76, 'lead'], [13, .3, 68, 'lead'],
  [19.4, 2, 67, 'lead'], [20.01, .5, 47, 'bass'],
];

describe('music-led chart selection', () => {
  it('preserves real bar times, adds bass, and follows pitch without inventing timing', () => {
    const [pulse, groove, melody] = (['pulse', 'groove', 'melody'] as const).map(level => buildLevelChart(song, events, level, 'recording'));
    expect(pulse.melody.map(n => [n.beat, n.lane])).toEqual([[4.07, 2], [8.12, 2]]);
    expect(groove.melody.filter(n => n.musicalRole === 'bass').map(n => n.beat)).toEqual([5.1, 9.13]);
    expect(melody.melody.length).toBeGreaterThan(groove.melody.length);
    expect(melody.melody.find(n => n.beat === 6.17)?.midi).toBeNull();
    expect(melody.melody.some(n => n.beat === 11 || n.beat >= 19.4)).toBe(false);
    const leads = melody.melody.filter(n => n.musicalRole === 'lead');
    expect(leads.find(n => n.midi === 78)!.lane).toBeGreaterThan(leads.find(n => n.midi === 62)!.lane);
    expect(melody.measureStarts).toEqual([4.07, 8.12]);
    expect(melody.sections).toBe(song.sections);
    expect(melody.backingTrack).toBe(song.backingTrack);
  });
});
