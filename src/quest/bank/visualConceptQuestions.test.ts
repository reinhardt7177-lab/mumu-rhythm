import { describe, expect, it } from 'vitest';
import type { BankQuestion, LessonId, ScoreNote, Visual } from './types';

// Globbing lets the first TDD run report missing content as failed contracts.
const modules = import.meta.glob<{
  VISUAL_QUESTIONS?: BankQuestion[];
  CONCEPT_QUESTIONS?: BankQuestion[];
}>('./{visual,concept}Questions.ts', { eager: true });
const visual = modules['./visualQuestions.ts']?.VISUAL_QUESTIONS ?? [];
const concept = modules['./conceptQuestions.ts']?.CONCEPT_QUESTIONS ?? [];
const all = [...visual, ...concept];
const grades = ['3-4', '5-6'] as const;
const lessons: LessonId[] = [
  'pulse', 'rhythm', 'rest', 'duration', 'pitch', 'melody',
  'dynamics', 'tempo', 'timbre', 'harmony', 'form', 'gugak',
];
const visualLessons: LessonId[] = [
  'duration', 'rest', 'rhythm', 'pitch', 'melody', 'dynamics', 'form', 'gugak',
];
const lengths = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };
function beats(notes: ScoreNote[]): number {
  return notes.reduce((sum, n) => sum + lengths[n.duration] *
    (2 - 2 ** -(n.dots ?? 0)), 0);
}
function pictures(q: BankQuestion): Visual[] {
  return [q.visual, ...q.choices.map(c => c.visual)].filter((v): v is Visual => !!v);
}
function question(id: string): BankQuestion {
  const q = all.find(item => item.id === id);
  expect(q, id).toBeDefined();
  return q!;
}
function choiceBeats(q: BankQuestion): number[] {
  return q.choices.map(c => c.visual?.kind === 'score' ? beats(c.visual.notes) : NaN);
}

describe('visual and concept bank authoring contracts', () => {
  it('exports exactly 32 visual and 24 concept questions', () => {
    expect(visual).toHaveLength(32);
    expect(concept).toHaveLength(24);
    expect(visual.every(q => q.kind === 'visual')).toBe(true);
    expect(concept.every(q => q.kind === 'concept')).toBe(true);
  });

  for (const grade of grades) {
    it(`allocates 16 visual questions across eight objectives for ${grade}`, () => {
      const items = visual.filter(q => q.grade === grade);
      expect(items).toHaveLength(16);
      for (const lesson of visualLessons) {
        expect(items.filter(q => q.lessonId === lesson), lesson).toHaveLength(2);
      }
    });
    it(`gives every one of the 12 lessons one concept question for ${grade}`, () => {
      const items = concept.filter(q => q.grade === grade);
      expect(items).toHaveLength(12);
      for (const lesson of lessons) {
        expect(items.filter(q => q.lessonId === lesson), lesson).toHaveLength(1);
      }
    });
  }

  it('has independent prompts, unique IDs, three distinct choices and usable feedback', () => {
    expect(all).toHaveLength(56);
    expect(new Set(all.map(q => q.id)).size).toBe(56);
    expect(new Set(all.map(q => q.prompt)).size).toBe(56);
    for (const q of all) {
      expect(grades).toContain(q.grade);
      expect(lessons).toContain(q.lessonId);
      expect(q.prompt.length, q.id).toBeGreaterThan(8);
      expect(q.choices, q.id).toHaveLength(3);
      expect(new Set(q.choices.map(c => JSON.stringify(c))).size, q.id).toBe(3);
      expect(Number.isInteger(q.correct), q.id).toBe(true);
      expect(q.correct, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correct, q.id).toBeLessThan(3);
      expect(q.why.length, q.id).toBeGreaterThan(15);
      expect(q.misconceptions, q.id).toHaveLength(3);
      expect(new Set(q.misconceptions).size, q.id).toBe(3);
      expect(q.misconceptions.every(m => m.length > 8), q.id).toBe(true);
      expect(q.audio, q.id).toBeUndefined();
    }
  });

  it('requires real notation for duration/rest/rhythm/pitch/melody, not word-only pictures', () => {
    expect(visual).toHaveLength(32);
    for (const q of visual) {
      const images = pictures(q);
      expect(images.length, q.id).toBeGreaterThan(0);
      if (['duration', 'rest', 'rhythm', 'pitch', 'melody'].includes(q.lessonId)) {
        expect(images.some(v => v.kind === 'score'), q.id).toBe(true);
      }
      for (const c of q.choices) {
        if (c.visual?.kind === 'score') expect(['가', '나', '다'], q.id).toContain(c.text);
      }
    }
  });

  it('uses engravable notes/rests and puts 4/4 only on exactly four quarter-note units', () => {
    const durations = new Set<string>();
    let rests = 0;
    for (const q of all) for (const v of pictures(q)) {
      if (v.kind !== 'score') continue;
      expect(v.notes.length, q.id).toBeGreaterThan(0);
      for (const note of v.notes) {
        durations.add(note.duration);
        expect(Object.keys(lengths), q.id).toContain(note.duration);
        expect(Number.isInteger(note.dots ?? 0), q.id).toBe(true);
        expect(note.dots ?? 0, q.id).toBeGreaterThanOrEqual(0);
        expect(note.dots ?? 0, q.id).toBeLessThanOrEqual(1);
        if (note.rest) rests++;
        else {
          expect(note.keys?.length, q.id).toBeGreaterThan(0);
          for (const key of note.keys ?? []) expect(key, q.id).toMatch(/^[a-g](?:#|b)?\/[3-6]$/);
        }
      }
      if (v.time !== undefined) {
        expect(v.time, q.id).toBe('4/4');
        expect(beats(v.notes), q.id).toBe(4);
      }
    }
    expect([...durations].sort()).toEqual(['16', '8', 'h', 'q', 'w']);
    expect(rests).toBeGreaterThan(0);
  });
});

describe('hand-checked notation answers', () => {
  it('selects relative duration, not the count of note heads', () => {
    const q = question('visual-34-duration-equivalent');
    expect(choiceBeats(q)).toEqual([1, 2, 4]);
    expect(q.correct).toBe(1);
    const unit = question('visual-34-duration-unit');
    expect(choiceBeats(unit)).toEqual([2, 4, 1]);
    expect(unit.correct).toBe(2);
  });

  it('interprets dots and sixteenth subdivisions with an explicit quarter-note beat', () => {
    const dot = question('visual-56-duration-dot');
    expect(choiceBeats(dot)).toEqual([2, 3, 4]);
    expect(dot.correct).toBe(1);
    const split = question('visual-56-duration-subdivide');
    expect(choiceBeats(split)).toEqual([0.5, 2, 1]);
    expect(split.correct).toBe(2);
  });

  it('keeps silence in elapsed time and distinguishes a dotted rest from a sound', () => {
    const q = question('visual-34-rest-space');
    expect(q.visual?.kind).toBe('score');
    if (q.visual?.kind === 'score') {
      expect(beats(q.visual.notes)).toBe(4);
      expect(q.visual.notes.map(n => !!n.rest)).toEqual([false, true, false, false]);
    }
    expect(q.correct).toBe(1);
    const dotted = question('visual-56-rest-dot');
    expect(dotted.visual?.kind).toBe('score');
    if (dotted.visual?.kind === 'score') {
      expect(dotted.visual.notes[0]).toMatchObject({ duration: 'q', rest: true, dots: 1 });
    }
    expect(dotted.correct).toBe(0);
  });

  it('offers exactly one valid completion and one sound/rest reordering', () => {
    const q = question('visual-56-rhythm-complete');
    expect(choiceBeats(q)).toEqual([1, 2, 3]);
    expect(q.correct).toBe(1);
    expect(q.visual?.kind).toBe('score');
    if (q.visual?.kind === 'score') expect(beats(q.visual.notes)).toBe(2);
    const move = question('visual-56-rhythm-reorder');
    expect(choiceBeats(move)).toEqual([4, 4, 4]);
    expect(move.correct).toBe(0);
    const notes = move.choices[move.correct].visual;
    expect(notes?.kind).toBe('score');
    if (notes?.kind === 'score') {
      expect(notes.notes.map(n => !!n.rest)).toEqual([false, false, false, true]);
    }
  });

  it('keeps contour distractors equal in length and represents simultaneous notes as a chord', () => {
    const q = question('visual-56-melody-arch');
    expect(choiceBeats(q)).toEqual([4, 4, 4]);
    expect(q.correct).toBe(2);
    const v = q.choices[q.correct].visual;
    if (v?.kind === 'score') expect(v.notes.map(n => n.keys)).toEqual([
      ['c/5'], ['e/5'], ['g/5'], ['e/5'],
    ]);
    const harmony = question('concept-56-harmony');
    expect(harmony.visual?.kind).toBe('score');
    if (harmony.visual?.kind === 'score') {
      expect(harmony.visual.notes).toEqual([{ keys: ['c/4', 'e/4', 'g/4'], duration: 'w' }]);
    }
    expect(harmony.correct).toBe(2);
  });
});
