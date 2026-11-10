import { describe, expect, it } from 'vitest';
import type { GradeBand, LessonId } from './types';
import { LESSONS as lessons } from './lessons';
import { ACTIVITIES as activities } from './activities';
const ids: LessonId[] = [
  'pulse', 'rhythm', 'rest', 'duration', 'pitch', 'melody',
  'dynamics', 'tempo', 'timbre', 'harmony', 'form', 'gugak',
];
const grades: GradeBand[] = ['3-4', '5-6'];

describe('approved first-phase lesson and activity content', () => {
  it('exports exactly the twelve approved lessons without duplicates', () => {
    expect(lessons.map(lesson => lesson.id).sort()).toEqual([...ids].sort());
  });

  it('gives both grade bands complete, distinct student teaching material', () => {
    expect(lessons).toHaveLength(12);
    for (const lesson of lessons) {
      expect(lesson.title.trim().length).toBeGreaterThan(1);
      expect(lesson.goals.length).toBeGreaterThanOrEqual(1);
      for (const grade of grades) {
        for (const field of ['intro', 'example', 'guide', 'pitfall'] as const) {
          expect(lesson.levels[grade][field].trim().length, `${lesson.id}/${grade}/${field}`)
            .toBeGreaterThan(15);
          expect(lesson.levels[grade][field]).not.toBe(lesson.levels[grade === '3-4' ? '5-6' : '3-4'][field]);
        }
      }
    }
  });

  it('uses existing grade-matched codes from the read 2024 elementary standards', () => {
    expect(lessons).toHaveLength(12);
    for (const lesson of lessons) {
      for (const grade of grades) {
        expect(lesson.standards[grade].length).toBeGreaterThan(0);
        for (const code of lesson.standards[grade]) {
          expect(code).toMatch(grade === '3-4'
            ? /^\[4음(?:01-0[1-4]|02-0[1-5]|03-0[1-4])\]$/
            : /^\[6음(?:01-0[1-4]|02-0[1-5]|03-0[1-4])\]$/);
        }
      }
    }
    expect(lessons.find(lesson => lesson.id === 'harmony')?.standards['5-6']).toContain('[6음01-03]');
    expect(lessons.find(lesson => lesson.id === 'form')?.standards['5-6']).toContain('[6음02-02]');
  });

  it('offers an acyclic set of preparation paths with independent pitch and gugak entry', () => {
    const byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
    const visit = (id: LessonId, path: LessonId[] = []): void => {
      expect(path, `cycle at ${id}`).not.toContain(id);
      const lesson = byId.get(id);
      expect(lesson, `missing prerequisite ${id}`).toBeDefined();
      for (const prerequisite of lesson!.prerequisites) visit(prerequisite, [...path, id]);
    };
    for (const id of ids) visit(id);
    expect(byId.get('pitch')?.prerequisites).toEqual([]);
    expect(byId.get('gugak')?.prerequisites).toEqual([]);
  });

  it('supplies valid full-measure score examples for rhythm, rests, duration and melody', () => {
    const lengths = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };
    for (const id of ['rhythm', 'rest', 'duration', 'melody'] as const) {
      for (const grade of grades) {
        const visual = lessons.find(lesson => lesson.id === id)?.levels[grade].visual;
        expect(visual?.kind, `${id}/${grade}`).toBe('score');
        if (visual?.kind !== 'score') continue;
        expect(visual.time).toBe('4/4');
        const total = visual.notes.reduce((sum, note) => {
          const dots = note.dots ?? 0;
          expect(dots).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(dots)).toBe(true);
          if (!note.rest) expect(note.keys?.length).toBeGreaterThan(0);
          return sum + lengths[note.duration] * (2 - 2 ** -dots);
        }, 0);
        expect(total, `${id}/${grade} quarter-note units`).toBe(4);
      }
    }
  });

  it('exports exactly one distinct activity per lesson and grade with usable observation prompts', () => {
    expect(activities).toHaveLength(24);
    expect(new Set(activities.map(activity => activity.id)).size).toBe(24);
    expect(new Set(activities.map(activity => activity.task)).size).toBe(24);
    expect(new Set(activities.map(activity => activity.reflection)).size).toBe(24);
    for (const id of ids) {
      for (const grade of grades) {
        const matches = activities.filter(activity => activity.lessonId === id && activity.grade === grade);
        expect(matches, `${id}/${grade}`).toHaveLength(1);
        const activity = matches[0];
        expect(activity.title.length).toBeGreaterThan(2);
        expect(activity.task.length).toBeGreaterThan(15);
        expect(activity.materials.length).toBeGreaterThan(0);
        expect(activity.steps.length).toBeGreaterThanOrEqual(2);
        expect(activity.checkpoints.length).toBeGreaterThanOrEqual(2);
        for (const text of [...activity.steps, ...activity.checkpoints, activity.reflection]) {
          expect(text.trim().length).toBeGreaterThan(8);
        }
      }
    }
  });
});
