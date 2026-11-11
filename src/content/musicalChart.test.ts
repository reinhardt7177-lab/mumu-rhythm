import { describe, expect, it } from 'vitest';
import { CHART_LEVELS, chartForLevel, chartSourceFor, encounterHealth, musicalLevels } from './musicalChart';
import { HOLD_NOTE_MIN_BEATS, type PlayMode, type Song } from '../types';
import { MUSIC_LIBRARY } from '../quest/catalog';
import { Combat, FLIGHT_SECONDS } from '../quest/combat';
import { bossBudget } from '../quest/boss';

function playThrough(song: Song, mode: PlayMode) {
  const spb = 60 / song.bpm;
  const combat = new Combat((power, progress) => bossBudget(song, mode, power, progress), encounterHealth(song));
  const hits = song.melody.map(n => (n.beat + (n.durationBeats >= HOLD_NOTE_MIN_BEATS ? n.durationBeats : 0)) * spb)
    .sort((a, b) => a - b);
  const duration = song.totalBeats * spb;
  let combo = 0;
  for (let frame = 0; frame / 120 <= duration + FLIGHT_SECONDS; frame++) {
    const time = frame / 120;
    combat.advance(time, Math.min(1, time / duration));
    while (hits[combo] !== undefined && hits[combo] <= time) combat.launch(false, ++combo, time);
  }
  return combat.kills;
}

describe('three music-led levels for the full library', () => {
  it.each(MUSIC_LIBRARY.map(({song}) => [song.id, song] as const))('%s has three musical levels and unchanged audio', async (id, song) => {
    expect(musicalLevels(song)).toBe(true);
    const source = (await chartSourceFor(song))!;
    const charts = await Promise.all(CHART_LEVELS.map(level => chartForLevel(song, level)));
    const [pulse, groove, melody] = charts.map(chart => chart.melody);
    expect(pulse.length).toBeGreaterThanOrEqual(8);
    expect(pulse.every(n => n.musicalRole === 'pulse' && n.lane === 2 && n.accent)).toBe(true);
    expect(groove.length).toBeGreaterThan(pulse.length);
    expect(groove.filter(n => n.musicalRole === 'bass').length).toBeGreaterThan(4);
    expect(groove.every(n => n.musicalRole === 'pulse' || n.musicalRole === 'bass')).toBe(true);
    expect(melody.length).toBeGreaterThan(groove.length);
    const lead = melody.filter(n => n.musicalRole === 'lead');
    expect(lead.length).toBeGreaterThan(10);
    expect(lead.some((n, i) => i > 0 && n.lane > lead[i - 1].lane)).toBe(true);
    expect(lead.some((n, i) => i > 0 && n.lane < lead[i - 1].lane)).toBe(true);
    expect(lead.every((n, i) => n.midi !== null && (!i || (n.midi - lead[i - 1].midi!) * (n.lane - lead[i - 1].lane) >= 0))).toBe(true);
    if (id === 'cloud-hop') {
      expect(pulse.slice(0, 2).map(n => n.beat)).toEqual([4, 8]);
      expect(melody.some(n => n.paired)).toBe(true);
      expect(melody.filter(n => n.durationBeats >= HOLD_NOTE_MIN_BEATS).length).toBeGreaterThan(4);
    }
    for (const [i, chart] of charts.entries()) {
      const label = id + '/' + CHART_LEVELS[i];
      expect(chart.sections).toBe(song.sections);
      expect(chart.backingTrack).toBe(song.backingTrack);
      expect(chart.backingTrackFallback).toBe(song.backingTrackFallback);
      expect(chart.bpm).toBe(song.bpm);
      expect(chart.totalBeats).toBe(song.totalBeats);
      expect(chart.chartSource).toBe(source.kind);
      for (const [j, note] of chart.melody.entries()) {
        expect(source.events.some(([beat, duration, midi, role]) =>
          beat === note.beat && duration >= note.durationBeats && midi === note.midi && role === note.musicalRole), label).toBe(true);
        expect(song.sections.some(s => s.mode === 'play' && s.startBeat <= note.beat && note.beat + note.durationBeats <= s.endBeat + 1e-7), label).toBe(true);
        const previous = chart.melody[j - 1];
        if (!previous) continue;
        if (previous.beat === note.beat) {
          expect([source.kind, CHART_LEVELS[i], previous.paired, note.paired], label).toEqual(['score', 'melody', true, true]);
          expect(previous.lane, label).toBeLessThan(note.lane);
          expect(Math.max(note.durationBeats, previous.durationBeats), label).toBeLessThan(HOLD_NOTE_MIN_BEATS);
        } else {
          const minGap = source.kind === 'score' ? .5 : .18 * song.bpm / 60;
          expect(note.beat - previous.beat, label).toBeGreaterThanOrEqual(minGap - 1e-7);
          if (previous.durationBeats >= HOLD_NOTE_MIN_BEATS)
            expect(note.beat, label).toBeGreaterThan(previous.beat + previous.durationBeats);
        }
      }
      expect(playThrough(chart, 'challenge'), label).toBe(4);
      expect(playThrough(chart, 'explore'), label).toBe(4);
    }
  });
});
