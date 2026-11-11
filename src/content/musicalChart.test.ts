import { describe, expect, it } from 'vitest';
import { chartForLevel, encounterHealth, musicalLevels, type ChartLevel } from './musicalChart';
import { cloudHopScore } from './cloudHopScore.generated';
import { songs } from './songs';
import { HOLD_NOTE_MIN_BEATS } from '../types';
import { Combat, FLIGHT_SECONDS } from '../quest/combat';
import { bossBudget } from '../quest/boss';

const cloud = songs.find(song => song.id === 'cloud-hop')!;
const levels: ChartLevel[] = ['pulse', 'groove', 'melody'];
describe('Cloud Hop musical chart', () => {
  it('uses the source recording without modifying other songs or the base chart', () => {
    const other = songs.find(song => song.id === 'can-can')!;
    expect(musicalLevels(other)).toBe(false);
    expect(chartForLevel(other, 'pulse')).toBe(other);
    expect(chartForLevel(cloud, 'pulse').backingTrack).toBe(cloud.backingTrack);
    expect(chartForLevel(cloud, 'melody').sections).toBe(cloud.sections);
  });

  it('adds real bass subdivisions and then genuine pitches, not invented timing', () => {
    const [pulse, groove, melody] = levels.map(level => chartForLevel(cloud, level).melody);
    expect(pulse.slice(0, 2).map(n => [n.beat, n.lane, n.musicalRole])).toEqual([[4, 2, 'bass'], [8, 2, 'bass']]);
    expect(pulse.slice(2).every(n => n.musicalRole === 'lead')).toBe(true);
    expect(pulse.filter(n => n.musicalRole === 'lead').length).toBeGreaterThan(24);
    expect(groove.length).toBeGreaterThan(pulse.length);
    expect(groove.some(n => n.musicalRole === 'lead')).toBe(true);
    expect(groove.some(n => n.musicalRole === 'bass')).toBe(true);
    expect(groove.some(n => n.beat % 1 === .5)).toBe(true);
    expect(melody.length).toBeGreaterThan(groove.length);
    expect(new Set(melody.map(n => n.lane)).size).toBe(5);
    const lead = melody.filter(n => n.musicalRole === 'lead');
    expect(lead.length).toBeGreaterThan(65);
    expect(lead.some((n, i) => i && n.lane > lead[i - 1].lane)).toBe(true);
    expect(lead.some((n, i) => i && n.lane < lead[i - 1].lane)).toBe(true);
    expect(lead.every((n, i) => !i || (n.midi - lead[i - 1].midi) * (n.lane - lead[i - 1].lane) >= 0)).toBe(true);
    for (const n of [...pulse, ...groove, ...melody]) {
      expect(cloudHopScore).toContainEqual([n.beat, n.durationBeats, n.midi, n.musicalRole]);
    }
  });

  it.each(levels)('%s preserves listening sections, spacing and exclusive holds', level => {
    const chart = chartForLevel(cloud, level);
    for (const [index, note] of chart.melody.entries()) {
      const section = chart.sections.find(s => note.beat >= s.startBeat && note.beat < s.endBeat);
      expect(section?.mode).toBe('play');
      expect(note.beat + note.durationBeats).toBeLessThanOrEqual(section!.endBeat);
      const previous = chart.melody[index - 1];
      if (previous) {
        if (note.beat === previous.beat) {
          expect(level).toBe('melody');
          expect(note.paired && previous.paired).toBe(true);
        } else expect(note.beat - previous.beat).toBeGreaterThanOrEqual(.5);
        if (previous.durationBeats >= HOLD_NOTE_MIN_BEATS) expect(note.beat).toBeGreaterThanOrEqual(previous.beat + previous.durationBeats);
      }
    }
    if (level === 'melody') expect(chart.melody.filter(n => n.durationBeats >= HOLD_NOTE_MIN_BEATS).length).toBeGreaterThan(4);
  });

  it('pairs only occasional real bass and lead attacks on distinct hands, outside holds', () => {
    const notes = chartForLevel(cloud, 'melody').melody;
    const beats = [...new Set(notes.filter(n => n.paired).map(n => n.beat))];
    expect(beats.length).toBeGreaterThanOrEqual(4);
    expect(beats.length).toBeLessThanOrEqual(12);
    for (const beat of beats) {
      const pair = notes.filter(n => n.beat === beat);
      expect(pair.map(n => n.musicalRole).sort()).toEqual(['bass', 'lead']);
      expect(pair.find(n => n.musicalRole === 'bass')!.lane).toBeLessThan(pair.find(n => n.musicalRole === 'lead')!.lane);
      expect(notes.some(n => n.durationBeats >= HOLD_NOTE_MIN_BEATS && n.beat <= beat && beat < n.beat + n.durationBeats + .5)).toBe(false);
    }
  });

  it.each(levels)('%s can complete all encounters even with on-time GOOD hits', level => {
    const chart = chartForLevel(cloud, level), spb = 60 / chart.bpm;
    const combat = new Combat((power, progress) => bossBudget(chart, 'challenge', power, progress), encounterHealth(chart));
    const hits = chart.melody.map(n => (n.beat + (n.durationBeats >= HOLD_NOTE_MIN_BEATS ? n.durationBeats : 0)) * spb);
    let combo = 0;
    for (let t = 0; t <= chart.totalBeats * spb + FLIGHT_SECONDS + .05; t += .01) {
      const progress = Math.min(1, t / (chart.totalBeats * spb));
      combat.advance(t, progress);
      while (hits[combo] !== undefined && hits[combo] <= t) combat.launch(false, ++combo, t);
    }
    expect(combat.kills).toBe(4);
  });
});
