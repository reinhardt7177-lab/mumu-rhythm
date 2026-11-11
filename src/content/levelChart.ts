import { HOLD_NOTE_MIN_BEATS, type MelodyNote, type Song } from '../types';

export const CHART_LEVELS = ['pulse', 'groove', 'melody'] as const;
export type ChartLevel = typeof CHART_LEVELS[number];
type SourceKind = NonNullable<Song['chartSource']>;
export type SourceEvent = readonly [beat: number, duration: number, midi: number | null, role: NonNullable<MelodyNote['musicalRole']>];

const quantile = (values: number[], fraction: number) => values[Math.floor((values.length - 1) * fraction)];
const EPS = 1e-7;
const held = (note: MelodyNote) => note.durationBeats >= HOLD_NOTE_MIN_BEATS;

export function buildLevelChart(song: Song, events: readonly SourceEvent[], level: ChartLevel, chartSource: SourceKind): Song {
  const pitches = events.flatMap(([, , midi, role]) => role === 'lead' && midi !== null ? [midi] : []).sort((a, b) => a - b);
  const lower = events.flatMap(([, , midi, role]) => role === 'bass' && midi !== null ? [midi] : []).sort((a, b) => a - b);
  const cuts = song.id === 'cloud-hop' ? [64, 69, 74, 79] : [.2, .4, .6, .8].map(fraction => quantile(pitches, fraction));
  const candidates: MelodyNote[] = [];
  for (const [index, [beat, duration, midi, musicalRole]] of events.entries()) {
    const section = song.sections.find(s => s.mode === 'play' && s.startBeat <= beat && beat < s.endBeat);
    const durationBeats = musicalRole === 'lead' ? duration : Math.min(duration, .65);
    if (!section || durationBeats <= 0 || beat + durationBeats > section.endBeat + EPS) continue;
    const lane = musicalRole === 'lead' && midi !== null ? cuts.filter(cut => midi > cut).length
      : musicalRole === 'bass' ? (midi !== null && midi > quantile(lower, .55) ? 3 : 1) : 2;
    candidates.push({ id: `${song.id}-${level}-${index}`, beat, durationBeats, midi, musicalRole, lane,
      accent: musicalRole === 'pulse', phrase: `${section.id}-${Math.floor((beat - section.startBeat) / (song.beatsPerBar * 2))}` });
  }
  candidates.sort((a, b) => a.beat - b.beat);
  const spb = 60 / song.bpm;
  const gap = Math.max(chartSource === 'score' ? .5 : 0, ({ pulse: .50, groove: .27, melody: .18 }[level]) / spb);
  const melody: MelodyNote[] = [];
  function fits(note: MelodyNote, except?: MelodyNote) {
    return melody.every(other => {
      if (other === except) return true;
      const [first, next] = note.beat < other.beat ? [note, other] : [other, note];
      const separation = held(first) ? first.durationBeats + .075 / spb : gap;
      return next.beat - first.beat >= separation - EPS;
    });
  }
  const order: NonNullable<MelodyNote['musicalRole']>[] = level === 'pulse' ? ['pulse']
    : level === 'groove' ? ['pulse', 'bass'] : ['lead', 'bass', 'rhythm', 'pulse'];
  for (const role of order) for (const note of candidates) {
    if (note.musicalRole !== role) continue;
    const position = (note.beat - song.leadInBeats) / (song.beatsPerBar * 2);
    if (level === 'melody' && chartSource === 'score' && role === 'bass' && Math.abs(position - Math.round(position)) < EPS) {
      const partner = melody.find(n => n.beat === note.beat && n.musicalRole === 'lead' && n.lane >= 2 && !held(n));
      if (partner && !partner.paired && fits(note, partner)) {
        partner.paired = true;
        melody.push({ ...note, lane: 0, paired: true });
        continue;
      }
    }
    if (fits(note)) melody.push(note);
  }
  const measureStarts = chartSource === 'recording' ? [...new Set(candidates.filter(n => n.accent).map(n => n.beat))] : undefined;
  return { ...song, chartSource, measureStarts, melody: melody.sort((a, b) => a.beat - b.beat || a.lane - b.lane) };
}
