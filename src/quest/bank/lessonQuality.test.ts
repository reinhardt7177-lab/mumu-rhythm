import { describe, expect, it } from 'vitest';
import { ACTIVITIES, LESSONS, QUESTIONS } from './index';
import type { GradeBand, LessonId } from './types';

const lessonIds: LessonId[] = [
  'pulse', 'rhythm', 'rest', 'duration', 'pitch', 'melody',
  'dynamics', 'tempo', 'timbre', 'harmony', 'form', 'gugak',
];
const grades: GradeBand[] = ['3-4', '5-6'];

function teachingFor(questionId: string): string {
  const question = QUESTIONS.find(item => item.id === questionId);
  if (!question) throw new Error(`Missing question: ${questionId}`);
  const lesson = LESSONS.find(item => item.id === question.lessonId);
  if (!lesson) throw new Error(`Missing lesson: ${question.lessonId}`);
  const { intro, example, guide, pitfall } = lesson.levels[question.grade];
  return [intro, example, guide, pitfall].join(' ');
}

function activityFor(id: string) {
  const activity = ACTIVITIES.find(item => item.id === id);
  if (!activity) throw new Error(`Missing activity: ${id}`);
  return activity;
}

// These are narrow content-contract guards, not proof of classroom effectiveness.
const teachingGaps: { questionId: string; concepts: RegExp[] }[] = [
  { questionId: 'concept-56-pulse', concepts: [/6\/8/, /8분음표 세 개/, /큰 박 두/] },
  { questionId: 'visual-34-pitch-position', concepts: [/줄.*아래/, /셋째 줄/, /음표 머리/] },
  { questionId: 'visual-56-pitch-name', concepts: [/아래 첫째 덧줄.*다\(C\)/] },
  { questionId: 'visual-56-pitch-register', concepts: [/옥타브/, /음이름.*같아도.*높이/] },
  { questionId: 'concept-56-pitch', concepts: [/다장조.*계이름 도·레·미.*음이름 다\(C\)·라\(D\)·마\(E\)/] },
  { questionId: 'concept-56-duration', concepts: [/점.*원래.*반/, /점4분음표.*한 박 반/] },
  { questionId: 'visual-34-duration-unit', concepts: [/4분음표.*검은 머리/, /2분음표.*빈 머리/, /온음표.*기둥/] },
  { questionId: 'visual-56-duration-subdivide', concepts: [/16분음표.*4분의 1/] },
  { questionId: 'visual-34-rest-length', concepts: [/2분쉼표.*두 박/] },
  { questionId: 'visual-56-rest-dot', concepts: [/점4분쉼표.*한 박 반/] },
  { questionId: 'concept-56-rest', concepts: [/두 마디.*셋째 마디/] },
  { questionId: 'visual-56-dynamics-plan', concepts: [/mf.*조금 세게/, /p.*mf.*f/] },
  { questionId: 'listen-56-timbre-1', concepts: [/플루트.*클라리넷.*목관악기/, /트럼펫.*금관악기/, /바이올린.*첼로.*현악기/] },
  { questionId: 'listen-56-timbre-4', concepts: [/플루트.*금속.*목관/, /피아노.*해머.*줄/, /오르간/] },
  { questionId: 'concept-56-harmony', concepts: [/세로.*함께/] },
  { questionId: 'visual-56-form-expand', concepts: [/A.*a-a/, /B.*b-b/, /A-B-A.*a-a.*b-b.*a-a/] },
  { questionId: 'concept-34-gugak', concepts: [/장단.*돌아오는.*손짓/] },
  { questionId: 'visual-34-gugak-cycle', concepts: [/구음/, /덩.*쿵.*덕/, /악기 소리.*입/] },
  { questionId: 'concept-56-gugak', concepts: [/앞 음절.*늘.*뒤 음절.*시작.*늦/, /장단.*한배.*지켜/, /원래 말붙임새.*한배만/] },
  { questionId: 'listen-56-rhythm-3', concepts: [/반 박.*한 박.*반 박.*두 박/, /박.*중간/] },
];

describe('lesson teaching and performance quality', () => {
  it('preserves the approved lesson IDs and all twenty-four grade-matched activity IDs', () => {
    expect(LESSONS.map(lesson => lesson.id).sort()).toEqual([...lessonIds].sort());
    expect(ACTIVITIES.map(activity => activity.id).sort()).toEqual(
      lessonIds.flatMap(id => grades.map(grade => `activity-${id}-${grade}`)).sort(),
    );
    for (const id of lessonIds) {
      expect(Object.keys(LESSONS.find(lesson => lesson.id === id)!.levels).sort()).toEqual(grades);
      for (const grade of grades) {
        expect(activityFor(`activity-${id}-${grade}`)).toMatchObject({ lessonId: id, grade });
      }
    }
  });

  it.each(teachingGaps)('teaches the prerequisite knowledge assessed by $questionId', ({ questionId, concepts }) => {
    const teaching = teachingFor(questionId);
    for (const concept of concepts) expect(teaching, `${questionId}: ${concept}`).toMatch(concept);
  });

  it('shows an actual staff when the lower-grade pitch lesson teaches staff positions', () => {
    const visual = LESSONS.find(lesson => lesson.id === 'pitch')!.levels['3-4'].visual;
    expect(visual?.kind).toBe('score');
    if (visual?.kind !== 'score') return;
    expect(visual.notes.some(note => note.keys?.includes('b/4'))).toBe(true);
  });

  it('lists a partner or group whenever steps ask children to work with a partner', () => {
    for (const activity of ACTIVITIES) {
      if (!activity.steps.some(step => /짝(?:[은는이가과을의]|에게)/.test(step))) continue;
      expect(activity.materials.join(' '), activity.id).toMatch(/짝|모둠|함께할 친구/);
    }
  });

  it.each(['pulse', 'rest', 'melody'] as const)('allows an already successful %s performance to be retained', id => {
    expect(activityFor(`activity-${id}-5-6`).checkpoints.join(' ')).toMatch(/유지|그대로|남길/);
  });

  it('moves the short pair by swapping slots rather than adding a second pair', () => {
    expect(activityFor('activity-rhythm-3-4').steps.join(' ')).toMatch(/타.*자리.*바(?:꾸|꿔)|티티가 있던.*타/);
  });

  it('gives the upper-grade rhythm task a way to sustain a two-beat sound', () => {
    const activity = activityFor('activity-rhythm-5-6');
    expect(activity.materials.join(' ')).toMatch(/목소리|길게 소리/);
    expect(activity.steps.join(' ')).toMatch(/두 박.*이어/);
  });

  it('applies C-major pitch-name and solfege mapping including the easily confused D name', () => {
    const activity = activityFor('activity-pitch-5-6');
    expect(activity.steps.join(' ')).toMatch(/계이름 도·레·미.*음이름 다\(C\)·라\(D\)·마\(E\)/);
    expect(activity.checkpoints.join(' ')).toMatch(/계이름 레.*음이름 라\(D\)/);
  });

  it('does not expand the first-phase tasks to the superseded tonic-shift and BPM questions', () => {
    for (const content of [...LESSONS, ...ACTIVITIES]) {
      expect(JSON.stringify(content), content.id).not.toMatch(/이동도법|사장조|긴자진|60박|120박/);
    }
  });

  it('keeps Korean do as a solfege syllable, not a fixed pitch name', () => {
    const teaching = teachingFor('concept-56-pitch');
    expect(teaching).toMatch(/계이름.*도/);
    expect(teaching).toMatch(/음이름.*다/);
    for (const content of [...LESSONS, ...ACTIVITIES]) {
      expect(JSON.stringify(content), content.id).not.toMatch(/음이름[은는이을를 :·]*도[·,]/);
    }
  });

  it('preserves real syllable-placement changes separately from hanbae and word substitution', () => {
    const activity = activityFor('activity-gugak-5-6');
    const steps = activity.steps.join(' ');
    expect(steps).toMatch(/노랫말.*그대로.*앞 음절.*늘.*뒤 음절.*시작.*늦/);
    expect(steps).toMatch(/박 끝.*다음 박의 시작.*지켜/);
    expect(steps).toMatch(/원래 말붙임새.*한배만/);
    expect(activity.checkpoints.join(' ')).toMatch(/음절.*시작.*옮겼.*소리.*표시/);
  });
});
