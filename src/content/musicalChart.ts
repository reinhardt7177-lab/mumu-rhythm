import { cloudHopScore } from './cloudHopScore.generated';
import { HOLD_NOTE_MIN_BEATS, type MelodyNote, type Song } from '../types';

export const CHART_LEVELS = ['pulse', 'groove', 'melody'] as const;
export type ChartLevel = typeof CHART_LEVELS[number];
export function musicalLevels(song: Song): boolean { return song.id === 'cloud-hop'; }

const melodyLane = (midi: number) => [64, 69, 74, 79].filter(pitch => midi > pitch).length;
const interval = (note: MelodyNote) => note.durationBeats >= HOLD_NOTE_MIN_BEATS ? note.durationBeats : .5;
const collides = (a: MelodyNote, b: MelodyNote) => a.beat < b.beat + interval(b) && b.beat < a.beat + interval(a);

export function chartForLevel(song: Song, level: ChartLevel): Song {
  if (!musicalLevels(song)) return song;
  const bass: MelodyNote[] = [], lead: MelodyNote[] = [];
  for (const [index, [beat, durationBeats, midi, musicalRole]] of cloudHopScore.entries()) {
    const section = song.sections.find(s => s.startBeat <= beat && beat < s.endBeat);
    if (section?.mode !== 'play' || beat + durationBeats > section.endBeat) continue;
    const position = (beat - song.leadInBeats) % song.beatsPerBar;
    const accent = position === 0;
    const note = {
      id: `${song.id}-${level}-${index}`, beat, durationBeats, midi, musicalRole, accent,
      phrase: `${section.id}-${Math.floor((beat - section.startBeat) / 8)}`,
      lane: musicalRole === 'lead' ? melodyLane(midi) : accent ? 2 : position === 2.5 ? 3 : 1,
    };
    if (musicalRole === 'lead') lead.push(note);
    else if (accent || (level !== 'pulse' && [1, 2.5, 3].includes(position))) bass.push(note);
  }
  const melody: MelodyNote[] = [];
  const warmupEnd = song.leadInBeats + 2 * song.beatsPerBar;
  if (level === 'pulse') melody.push(...bass.filter(n => n.beat < warmupEnd));
  for (const [i, note] of lead.entries()) {
    const before = lead[i - 1], after = lead[i + 1];
    if (level === 'pulse') {
      if (note.beat < warmupEnd) continue;
      const edge = before?.phrase !== note.phrase || after?.phrase !== note.phrase;
      const turn = before && after && (note.midi - before.midi) * (after.midi - note.midi) < 0;
      if (!edge && !turn && note.beat % 1 !== 0) continue;
    }
    const gap = level === 'melody' ? .5 : level === 'groove' ? .75 : 1;
    if (!melody.some(n => collides(n, note) || Math.abs(n.beat - note.beat) < gap)) melody.push(note);
  }
  // Preserve the melody first. Only a real shared attack can become a two-hand cue.
  if (level !== 'pulse') for (const note of bass) {
    const partner = melody.find(n => n.beat === note.beat && n.musicalRole === 'lead');
    const pair = level === 'melody' && (note.beat - song.leadInBeats) % (2 * song.beatsPerBar) === 0
      && partner && partner.lane >= 2 && partner.durationBeats < HOLD_NOTE_MIN_BEATS
      && !melody.some(n => n.durationBeats >= HOLD_NOTE_MIN_BEATS && n.beat <= note.beat
        && note.beat < n.beat + n.durationBeats + .5)
      && !melody.some(n => n !== partner && collides(n, note));
    if (pair) {
      partner.paired = true;
      melody.push({ ...note, lane: 0, paired: true });
    } else if (!melody.some(n => collides(n, note))) melody.push(note);
  }
  return { ...song, melody: melody.sort((a, b) => a.beat - b.beat) };
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
