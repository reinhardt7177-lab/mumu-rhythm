import { describe, expect, it } from 'vitest';
import { CONCEPT_QUESTIONS } from './conceptQuestions';
import { LESSONS } from './lessons';

function question(id: string) {
  const item = CONCEPT_QUESTIONS.find(q => q.id === id);
  if (!item) throw new Error(`Missing concept question: ${id}`);
  return item;
}

describe('concept question quality regressions', () => {
  it('preserves one stable concept ID per lesson and grade, with aligned feedback slots', () => {
    expect(CONCEPT_QUESTIONS).toHaveLength(24);
    const expectedIds = LESSONS.flatMap(lesson => ['34', '56'].map(
      grade => `concept-${grade}-${lesson.id}`,
    ));
    expect(CONCEPT_QUESTIONS.map(q => q.id).sort()).toEqual(expectedIds.sort());
    for (const q of CONCEPT_QUESTIONS) {
      expect(q.id).toBe(`concept-${q.grade.replace('-', '')}-${q.lessonId}`);
      expect(q.kind).toBe('concept');
      expect(q.choices, q.id).toHaveLength(3);
      expect(new Set(q.choices.map(c => c.text)).size, q.id).toBe(3);
      expect(Number.isInteger(q.correct), q.id).toBe(true);
      expect(q.correct, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correct, q.id).toBeLessThan(3);
      expect(q.misconceptions, q.id).toHaveLength(3);
      expect(q.misconceptions.every(text => text.trim().length > 8), q.id).toBe(true);
    }
  });

  it('does not make distractors disposable through absolute-word giveaways', () => {
    for (const q of CONCEPT_QUESTIONS) {
      for (const [index, choice] of q.choices.entries()) {
        if (index === q.correct) continue;
        expect(choice.text, `${q.id}/${index}`).not.toMatch(/언제나|무조건|반드시|어떤 곡이든|어떤 곡에서나/);
      }
    }
  });

  it('applies the two-to-one note ratio with an explicit beat unit', () => {
    const q = question('concept-34-duration');
    expect(q.prompt).toMatch(/4분음표를 한 박/);
    expect(q.choices.map(c => Number(c.text.match(/\d+/)?.[0]))).toEqual([2, 1, 4]);
    expect(q.correct).toBe(0);
    expect(q.why).toMatch(/두 박/);
  });

  it('adds half the original duration for a dot, rather than doubling or using BPM', () => {
    const q = question('concept-56-duration');
    expect(q.prompt).toMatch(/4분음표를 한 박/);
    expect(q.prompt).toMatch(/점4분음표/);
    expect(q.choices.map(c => Number(c.text.match(/\d+(?:\.\d+)?/)?.[0]))).toEqual([1, 1.5, 2]);
    expect(q.correct).toBe(1);
    expect(q.why).toMatch(/반 박/);
    expect(q.misconceptions[2]).toMatch(/두 배/);
  });

  it('assesses the taught C-major pitch-name mapping without requiring transposition', () => {
    const q = question('concept-56-pitch');
    expect(q.prompt).toMatch(/다장조/);
    expect(q.prompt).toMatch(/계이름.*레/);
    expect(q.prompt).not.toMatch(/이동도법|사장조|조를 바꾸/);
    expect(q.choices[q.correct].text).toBe('라(D)');
    expect(q.misconceptions[1]).toMatch(/미/);
    expect(q.misconceptions[2]).toMatch(/솔/);
  });

  it('keeps gugak assessment on the taught cycle and lyric-placement objectives', () => {
    const junior = question('concept-34-gugak');
    const senior = question('concept-56-gugak');
    expect(junior.prompt).toMatch(/장단/);
    expect(junior.choices[junior.correct].text).toMatch(/장단.*다시 시작/);
    expect(senior.prompt).toMatch(/말붙임새/);
    expect(senior.choices[senior.correct].text).toMatch(/음절/);
    for (const q of [junior, senior]) {
      expect([q.prompt, q.why, ...q.choices.map(c => c.text)].join(' ')).not.toMatch(/구음|긴자진|긴소리|자진소리/);
    }
    expect(senior.why).toMatch(/시작.*길이/);
    expect(senior.misconceptions[0]).toMatch(/빠르기|한배/);
    expect(senior.misconceptions[2]).toMatch(/세기|셈여림/);
  });

  it('distinguishes every syllable or stroke from the return of the whole jangdan', () => {
    const q = question('concept-34-gugak');
    expect(q.choices[0].text).toMatch(/마다/);
    expect(q.choices[1].text).toMatch(/마다/);
    expect(q.correct).toBe(2);
    expect(q.misconceptions[1]).toMatch(/여러 번/);
  });

  it('explains stepwise melody with adjacent notes, not untaught transposition terminology', () => {
    const q = question('concept-56-melody');
    expect(q.choices[q.correct].text).toBe('파-솔-라');
    expect(q.why).toMatch(/이웃/);
    expect(q.why).not.toMatch(/조옮김|음정/);
  });

  it('checks that p is softer than f, not merely that their volumes differ', () => {
    const q = question('concept-56-dynamics');
    expect(q.choices[q.correct].text).toMatch(/p.*f.*여리/);
    expect(q.why).toMatch(/p.*여리.*f.*세게/);
    expect(q.misconceptions[q.correct]).toMatch(/거꾸로|방향/);
  });

  it('controls voice duration as well as pitch and loudness in the timbre scenario', () => {
    expect(question('concept-34-timbre').prompt).toMatch(/높이.*길이.*세기/);
  });

  it('gives every instrument-comparison option the same three comparison dimensions', () => {
    const q = question('concept-56-timbre');
    for (const choice of q.choices) expect(choice.text).toMatch(/높이.*길이.*세기/);
    expect(q.choices[q.correct].text).toMatch(/높이.*같.*길이.*같.*세기.*비슷/);
  });

  it('continues the pulse during a specified silent interval', () => {
    const q = question('concept-34-pulse');
    expect(q.prompt).toMatch(/두 박.*쉬/);
    expect(q.choices[q.correct].text).toMatch(/같은 간격.*두 번/);
    expect(q.misconceptions[2]).toMatch(/두 배/);
  });

  it('rules out an earlier start as the cause of finishing first in the tempo scenario', () => {
    const q = question('concept-34-tempo');
    expect(q.prompt).toMatch(/동시에 시작/);
    expect(q.choices[q.correct].text).toMatch(/박 간격.*맞/);
    expect(q.misconceptions[2]).toMatch(/끝.*기다/);
  });

  it('distinguishes different simultaneous pitches from turn-taking and unison', () => {
    const q = question('concept-34-harmony');
    expect(q.choices[q.correct].text).toMatch(/같은 때.*시작/);
    expect(q.misconceptions[0]).toMatch(/번갈아|차례/);
    expect(q.misconceptions[2]).toMatch(/같은 높이/);
  });

  it('applies call-and-response without requiring an identical answering melody', () => {
    const q = question('concept-34-form');
    expect(q.prompt).toMatch(/앞소리.*달라/);
    expect(q.choices[q.correct].text).toMatch(/약속한 뒷소리/);
    expect(q.why).toMatch(/똑같/);
  });
});
