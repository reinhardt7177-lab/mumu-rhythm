import { describe, expect, it } from 'vitest';
import { VISUAL_QUESTIONS } from './visualQuestions';
import type { BankQuestion, ScoreNote, Visual } from './types';

function question(suffix: string): BankQuestion {
  const q = VISUAL_QUESTIONS.find(item => item.id === `visual-${suffix}`);
  if (!q) throw new Error(`Missing visual-${suffix}`);
  return q;
}
function notes(v: Visual | undefined): ScoreNote[] {
  if (v?.kind !== 'score') throw new Error('Expected a score');
  return v.notes;
}
function cells(v: Visual | undefined): string[] {
  if (v?.kind !== 'labels') throw new Error('Expected a diagram');
  return v.cells;
}
const lengths = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };
function beats(ns: ScoreNote[]): number {
  return ns.reduce((sum, n) => sum + lengths[n.duration] * (2 - 2 ** -(n.dots ?? 0)), 0);
}
function pitches(ns: ScoreNote[]): number[] {
  return ns.map(n => {
    const match = /^([a-g])\/(\d)$/.exec(n.keys?.[0] ?? '');
    if (!match || n.rest) throw new Error('Expected a natural pitched note');
    return Number(match[2]) * 7 + 'cdefgab'.indexOf(match[1]);
  });
}
function steps(ns: ScoreNote[]): number[] {
  const ps = pitches(ns);
  return ps.slice(1).map((p, i) => p - ps[i]);
}
function sameNotes(a: ScoreNote[], b: ScoreNote[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
function uniqueAnswer(q: BankQuestion, matches: boolean[]): void {
  expect(matches.flatMap((match, i) => match ? [i] : []), q.id).toEqual([q.correct]);
}

describe('all 32 visual questions: musical answer audit', () => {
  const pairs = [
    ['duration', ['equivalent', 'unit'], ['dot', 'subdivide']],
    ['rest', ['space', 'length'], ['dot', 'balance']],
    ['rhythm', ['pairs', 'match'], ['complete', 'reorder']],
    ['pitch', ['higher', 'position'], ['name', 'register']],
    ['melody', ['step', 'turn'], ['arch', 'revise']],
    ['dynamics', ['symbol', 'contrast'], ['crescendo', 'plan']],
    ['form', ['repeat', 'group'], ['return', 'expand']],
    ['gugak', ['cycle', 'syllables'], ['accent', 'hanbae']],
  ] as const;

  it('preserves IDs, grade, lesson, kind and three feedback-aligned choices', () => {
    expect(VISUAL_QUESTIONS).toHaveLength(32);
    expect(new Set(VISUAL_QUESTIONS.map(q => q.id)).size).toBe(32);
    for (const [lesson, younger, older] of pairs) {
      for (const [grade, suffixes] of [['3-4', younger], ['5-6', older]] as const) {
        for (const suffix of suffixes) {
          const q = question(`${grade.replace('-', '')}-${lesson}-${suffix}`);
          expect(q).toMatchObject({ lessonId: lesson, grade, kind: 'visual' });
          expect(q.choices, q.id).toHaveLength(3);
          expect(q.misconceptions, q.id).toHaveLength(3);
          expect(q.misconceptions[q.correct], q.id).toMatch(/^맞아요/);
          expect(q.misconceptions.every(m => m.length > 8), q.id).toBe(true);
        }
      }
    }
  });

  const scoreAnswers: [string, (ns: ScoreNote[], q: BankQuestion) => boolean][] = [
    ['34-duration-equivalent', (ns, q) => beats(ns) === beats(notes(q.visual))],
    ['34-duration-unit', ns => beats(ns) === 1],
    ['34-rhythm-match', (ns, q) => JSON.stringify(ns.map(n => n.duration)) ===
      JSON.stringify(notes(q.visual).map(n => n.duration))],
    ['34-pitch-position', ns => pitches(ns)[0] === 34], // B4: treble staff's third line.
    ['34-melody-step', ns => steps(ns).every(step => step === 1)],
    ['56-duration-dot', (ns, q) => beats(ns) === beats(notes(q.visual))],
    ['56-duration-subdivide', (ns, q) => ns.length === 4 &&
      ns.every(n => !n.rest && beats([n]) === beats(ns) / 4) && beats(ns) === beats(notes(q.visual))],
    ['56-rhythm-complete', (ns, q) => beats(ns) + beats(notes(q.visual)) === 4],
    ['56-rhythm-reorder', (ns, q) => {
      const original = notes(q.visual);
      const rest = original.findIndex(n => n.rest);
      const last = original.length - 1;
      const expected = [...original];
      [expected[rest], expected[last]] = [expected[last], expected[rest]];
      return sameNotes(ns, expected);
    }],
    ['56-melody-arch', ns => {
      const ds = steps(ns);
      return ds[0] > 1 && ds[1] > 1 && ds[2] < 0;
    }],
    ['56-melody-revise', (ns, q) => sameNotes(ns.slice(0, 3), notes(q.visual).slice(0, 3)) &&
      steps(ns)[2] === -1],
  ];
  for (const [id, accepts] of scoreAnswers) {
    it(`${id}: the engraved notes satisfy the task in exactly one choice`, () => {
      const q = question(id);
      uniqueAnswer(q, q.choices.map(c => accepts(notes(c.visual), q)));
    });
  }

  it('34-rest-space, 34-rest-length and 34-rhythm-pairs: counts elapsed beats, not glyphs', () => {
    const space = question('34-rest-space');
    expect(notes(space.visual).map(n => !!n.rest)).toEqual([false, true, false, false]);
    expect(beats(notes(space.visual).slice(0, 1))).toBe(1);
    expect(space.choices[space.correct].text).toBe('둘째 박');
    const length = question('34-rest-length');
    expect(notes(length.visual).every(n => n.rest)).toBe(true);
    expect(beats(notes(length.visual))).toBe(2);
    expect(length.choices[length.correct].text).toBe('두 박');
    const pairs = question('34-rhythm-pairs');
    expect(notes(pairs.visual).map(n => beats([n]))).toEqual([1, 0.5, 0.5, 2]);
    expect(pairs.choices[pairs.correct].text).toBe('둘째 박');
  });

  it('34-pitch-higher and 34-melody-turn: reads heads rather than stems or left/right', () => {
    const higher = question('34-pitch-higher');
    expect(steps(notes(higher.visual))).toEqual([4]);
    expect(higher.choices[higher.correct].text).toBe('둘째 음');
    const turn = question('34-melody-turn');
    expect(steps(notes(turn.visual))).toEqual([-1, -1, 1]);
    expect(turn.choices[turn.correct].text).toBe('내려갔다가 마지막에 올라가요');
  });

  it('56-rest-dot and 56-rest-balance: includes dot length and silent time', () => {
    const dot = question('56-rest-dot');
    expect(notes(dot.visual).every(n => n.rest)).toBe(true);
    expect(beats(notes(dot.visual))).toBe(1.5);
    expect(dot.choices[dot.correct].text).toBe('한 박 반');
    const balance = question('56-rest-balance');
    expect(beats(notes(balance.visual).filter(n => !n.rest))).toBe(2);
    expect(beats(notes(balance.visual).filter(n => n.rest))).toBe(2);
    expect(balance.choices[balance.correct].text).toBe('소리 두 박, 쉼 두 박');
  });

  it('56-pitch-name and 56-pitch-register: distinguishes Korean pitch names and octaves', () => {
    const name = question('56-pitch-name');
    expect(pitches(notes(name.visual))).toEqual([28]); // Middle C, not A or G.
    expect(name.choices[name.correct].text).toBe('다(C)');
    const register = question('56-pitch-register');
    expect(steps(notes(register.visual))).toEqual([7]);
    expect(register.choices[register.correct].text).toBe('둘째 음이 한 옥타브 높아요');
  });

  it.each([
    ['34-dynamics-symbol', ['p'], '여리게 연주해요'],
    ['34-dynamics-contrast', ['첫째: p', '둘째: f'], '여리게 연주하다 세게 연주해요'],
    ['56-dynamics-crescendo', ['p', '→', 'mf', '→', 'f'], '소리가 조금씩 세지는 변화'],
    ['34-form-repeat', ['a', 'b', 'a'], '첫째와 셋째 부분'],
    ['34-form-group', ['a', 'a', 'b', 'b'], 'a를 두 번 한 뒤 b를 두 번 해요'],
    ['34-gugak-cycle', ['덩', '쿵', '덕', '덩', '쿵', '?'], '덕'],
    ['34-gugak-syllables', ['1박: 봄', '2박: 바·람', '3박: 분', '4박: 다'], '둘째 박'],
    ['56-gugak-accent', ['> 덩', '쿵', '덕', '쿵'], '첫 칸에 힘을 주고 칸의 간격은 유지해요'],
  ])('%s: keeps the displayed diagram consistent with the keyed verbal answer', (id, diagram, answer) => {
    const q = question(id as string);
    expect(cells(q.visual)).toEqual(diagram);
    uniqueAnswer(q, q.choices.map(c => c.text === answer));
  });

  it('56-dynamics-plan: exactly one plan ends softer than it starts', () => {
    const q = question('56-dynamics-plan');
    const strength: Record<string, number> = { p: 1, mf: 2, f: 3 };
    uniqueAnswer(q, q.choices.map(c => {
      const plan = cells(c.visual);
      return strength[plan.at(-1)!] < strength[plan[0]];
    }));
  });

  it('56-form-return and 56-form-expand: derives the result from the source diagram', () => {
    const replace = question('56-form-return');
    const changed = [...cells(replace.visual)];
    changed[1] = 'c';
    uniqueAnswer(replace, replace.choices.map(c => JSON.stringify(cells(c.visual)) === JSON.stringify(changed)));
    const expand = question('56-form-expand');
    expect(cells(expand.visual)).toEqual(['A: a + a', 'B: b + b']);
    uniqueAnswer(expand, expand.choices.map(c => cells(c.visual).join('') === 'aabbaa'));
  });

  it('56-gugak-hanbae: compares the same beat on a common time scale', () => {
    const q = question('56-gugak-hanbae');
    const rows = cells(q.visual).map(row => row.split(': ')[1].split(' '));
    expect(rows.map(row => row.filter(token => token !== '·'))).toEqual([
      ['덩', '쿵', '덕'], ['덩', '쿵', '덕'],
    ]);
    expect(rows.map(row => row.indexOf('쿵') - row.indexOf('덩'))).toEqual([3, 2]);
    expect(q.choices[q.correct].text).toBe('더 빨라져요');
    expect(q.prompt).toMatch(/한 박.*시작/);
    expect(q.prompt).toMatch(/같은.*시간/);
    expect(q.why).toMatch(/박.*간격/);
  });
});

describe('visual item educational quality regressions', () => {
  it('56-gugak-hanbae: requests temporal rows instead of equal-width wrapping cells', () => {
    expect(question('56-gugak-hanbae').visual).toMatchObject({
      kind: 'labels', layout: 'rows',
    });
  });

  it.each([
    ['34-duration-equivalent', /2분음표/],
    ['34-rest-length', /2분쉼표/],
    ['56-duration-dot', /점2분음표/],
    ['56-duration-subdivide', /16분음표/],
    ['56-rest-dot', /점4분쉼표/],
    ['56-pitch-name', /첫째 덧줄/],
    ['34-gugak-cycle', /덩.*쿵.*덕/],
    ['56-form-return', /a-b-a/],
    ['56-form-expand', /A는 a-a|B는 b-b/],
  ])('%s: the stem does not transcribe the image fact being assessed', (id, giveaway) => {
    expect(question(id).prompt).not.toMatch(giveaway);
  });

  it('56-duration-subdivide: each distractor meets only one of the two conditions', () => {
    const q = question('56-duration-subdivide');
    expect(q.prompt).toMatch(/네|4개/);
    expect(q.prompt).toMatch(/같은 길이/);
    expect(q.prompt).toMatch(/전체 길이/);
    expect(q.prompt).toMatch(/4분음표.*한 박/);
    expect(q.choices.map(c => notes(c.visual).length)).toEqual([2, 4, 4]);
    expect(q.choices.map(c => beats(notes(c.visual)))).toEqual([0.5, 2, 1]);
    expect(notes(q.choices[0].visual).every(n => n.duration === '16')).toBe(true);
    for (const c of q.choices) expect(new Set(notes(c.visual).map(n => beats([n]))).size).toBe(1);
    expect(q.misconceptions[0]).toMatch(/두 개|두 음|2개/);
  });

  it('56-pitch-name: uses correctly paired adjacent pitch-name distractors', () => {
    const q = question('56-pitch-name');
    expect(q.choices.map(c => c.text)).toEqual(['나(B)', '다(C)', '라(D)']);
    expect(q.misconceptions[0]).toContain('나(B)');
    expect(q.misconceptions[2]).toContain('라(D)');
  });

  it.each(['34-dynamics-symbol', '34-dynamics-contrast', '56-dynamics-crescendo'])
  ('%s: all choices concern strength, not a trivially excluded musical dimension', id => {
    const q = question(id);
    for (const c of q.choices) {
      expect(c.text).not.toMatch(/빠르|빨라|높[아은]|박이/);
      expect(c.text).toMatch(/여리|여려|세게|세지|세기/);
    }
  });

  it('56-dynamics-plan: requires interpreting symbols rather than copying endpoints', () => {
    const q = question('56-dynamics-plan');
    expect(q.prompt).not.toMatch(/\bmf\b|\bp\b/);
    expect(q.prompt).toMatch(/여리게/);
    expect(q.prompt).toMatch(/조금씩/);
  });

  it('56-rhythm-reorder: ending on a rest alone cannot bypass comparing the original', () => {
    const q = question('56-rhythm-reorder');
    expect(q.prompt).not.toMatch(/둘째 박|소리 세 번/);
    for (const c of q.choices) {
      expect(notes(c.visual).at(-1)?.rest).toBe(true);
      expect(beats(notes(c.visual))).toBe(4);
    }
    expect(q.misconceptions[1]).toMatch(/둘째/);
    expect(q.misconceptions[2]).toMatch(/첫째/);
  });

  it('56-melody-arch: one distractor preserves the arch but confuses steps with skips', () => {
    const q = question('56-melody-arch');
    expect(steps(notes(q.choices[0].visual))).toEqual([1, 1, -1]);
    expect(q.misconceptions[0]).toMatch(/차례/);
    expect(q.misconceptions[0]).not.toMatch(/끝까지.* 올라|마지막 내려오기.*맞지/);
  });

  it('56-form-return: every option changes the middle, so preserved outer parts must be checked', () => {
    const q = question('56-form-return');
    for (const c of q.choices) expect(cells(c.visual)[1]).toBe('c');
    expect(cells(q.choices[0].visual)[0]).toBe(cells(q.choices[0].visual)[2]);
    expect(q.misconceptions[0]).toMatch(/처음과 끝/);
    expect(q.misconceptions[2]).toMatch(/마지막/);
  });

  it('56-form-expand: every option has six phrases, so counting cells cannot select the answer', () => {
    const q = question('56-form-expand');
    for (const c of q.choices) expect(cells(c.visual)).toHaveLength(6);
    expect(q.misconceptions[0]).toMatch(/번갈아|섞/);
  });

  it.each([
    '34-duration-unit', '34-rest-space', '34-rest-length', '34-rhythm-pairs',
    '56-duration-dot', '56-duration-subdivide', '56-rest-dot', '56-rest-balance',
    '56-rhythm-complete', '56-rhythm-reorder',
  ])('%s: defines the quarter-note beat before asking for beat counts', id => {
    expect(question(id).prompt).toMatch(/4분음표.*한 박/);
  });
});
