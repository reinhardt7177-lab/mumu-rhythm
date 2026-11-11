import { cloudHopScore } from './cloudHopScore.generated';
import { synthScores } from './synthScores.generated';
import { extraSongs } from './extraSongs';
import { buildLevelChart, type ChartLevel, type SourceEvent } from './levelChart';
import { HOLD_NOTE_MIN_BEATS, type Song } from '../types';

export { CHART_LEVELS, type ChartLevel } from './levelChart';

const cloudPulse: SourceEvent[] = cloudHopScore
  .filter(([beat, , , role]) => role === 'bass' && (beat - 4) % 4 === 0)
  .map(([beat, duration, midi]) => [beat, duration, midi, 'pulse']);

const authoredScores: Record<string, readonly SourceEvent[]> = {
  ...synthScores, 'cloud-hop': [...cloudHopScore, ...cloudPulse],
};
const recordedIds = new Set(['can-can', 'turkish-march', 'william-tell', ...extraSongs.map(song => song.id)]);

export async function chartSourceFor(song: Song) {
  const events = authoredScores[song.id];
  if (events) return { events, kind: 'score' as const };
  if (!recordedIds.has(song.id)) return undefined;
  const { recordedScores } = await import('./recordedScores.generated');
  const recorded = recordedScores[song.id];
  if (!recorded) throw new Error(`Missing recording chart: ${song.id}`);
  return { events: recorded, kind: 'recording' as const };
}

export function musicalLevels(song: Song): boolean { return !!authoredScores[song.id] || recordedIds.has(song.id); }

export async function chartForLevel(song: Song, level: ChartLevel): Promise<Song> {
  const source = await chartSourceFor(song);
  return source ? buildLevelChart(song, source.events, level, source.kind) : song;
}

export function encounterHealth(song: Song): readonly [number, number, number] | undefined {
  if (!song.melody.some(note => note.musicalRole)) return undefined;
  const endBeats = song.melody.map(n => n.beat + (n.durationBeats >= HOLD_NOTE_MIN_BEATS ? n.durationBeats : 0));
  const health = (phase: number, cap: number) => {
    const count = endBeats.filter(beat => beat >= phase * .24 * song.totalBeats &&
      beat < (phase + 1) * .24 * song.totalBeats).length;
    return Math.max(12, Math.min(cap, count * 9));
  };
  return [health(0, 180), health(1, 220), health(2, 260)];
}
