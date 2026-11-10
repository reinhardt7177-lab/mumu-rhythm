import { describe, expect, it } from 'vitest';
import type { BankQuestion, ListeningClip } from './types';
import { LISTENING_QUESTIONS as questions } from './listeningQuestions';

const get = (grade: string, lesson: string, n: number) => {
  const question = questions.find(q => q.id === `listen-${grade}-${lesson}-${n}`);
  expect(question, `${grade}/${lesson}/${n}`).toBeDefined();
  return question!;
};
const pitches = (clip: ListeningClip) => clip.events.map(e => e.midi);
const answer = (q: BankQuestion) => q.choices[q.correct].text;

describe('authored listening bank', () => {
  it('delivers exactly 40 unique listening questions, 20 per grade and the agreed lesson balance', () => {
    expect(questions).toHaveLength(40);
    expect(new Set(questions.map(q => q.id)).size).toBe(40);
    expect(questions.reduce((sum, q) => sum + (q.audio?.length ?? 0), 0)).toBeGreaterThanOrEqual(60);
    const counts = { rhythm: 4, rest: 2, pitch: 2, melody: 2, dynamics: 2, tempo: 2, timbre: 4, harmony: 1, form: 1 };
    for (const [grade, short] of [['3-4', '34'], ['5-6', '56']]) {
      expect(questions.filter(q => q.grade === grade)).toHaveLength(20);
      for (const [lesson, count] of Object.entries(counts)) {
        expect(questions.filter(q => q.grade === grade && q.lessonId === lesson)).toHaveLength(count);
        for (let n = 1; n <= count; n++) expect(get(short, lesson, n).grade).toBe(grade);
      }
    }
  });

  it('provides three distinct choices, aligned feedback and safe, neutrally labelled acoustic sample events', () => {
    const clipIds: string[] = [];
    for (const q of questions) {
      expect(q.kind, q.id).toBe('listening');
      expect(q.prompt.length).toBeGreaterThan(8);
      expect(q.choices).toHaveLength(3);
      expect(new Set(q.choices.map(c => JSON.stringify(c))).size).toBe(3);
      expect(Number.isInteger(q.correct)).toBe(true);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(3);
      expect(q.why.length).toBeGreaterThan(15);
      expect(q.misconceptions).toHaveLength(3);
      expect(q.misconceptions.every(m => m.length > 8)).toBe(true);
      expect(JSON.stringify(q)).not.toMatch(/실황|오케스트라 녹음|현장 녹음/);
      expect(q.audio?.length).toBeGreaterThan(0);
      for (const [i, clip] of q.audio!.entries()) {
        clipIds.push(clip.id);
        expect(clip.label).toBe(`소리 ${String.fromCharCode(65 + i)}`);
        expect(['piano', 'flute', 'violin', 'trumpet', 'clarinet', 'cello']).toContain(clip.instrument);
        expect(clip.bpm).toBeGreaterThanOrEqual(48);
        expect(clip.bpm).toBeLessThanOrEqual(160);
        expect(clip.events.length).toBeGreaterThan(0);
        for (const event of clip.events) {
          expect(Number.isFinite(event.beat)).toBe(true);
          expect(event.beat).toBeGreaterThanOrEqual(0);
          expect(event.duration).toBeGreaterThan(0);
          expect(Number.isFinite(event.duration)).toBe(true);
          expect(event.velocity).toBeGreaterThanOrEqual(0.15);
          expect(event.velocity).toBeLessThanOrEqual(0.75);
          const midi = [event.midi].flat();
          expect(midi.length).toBeGreaterThan(0);
          for (const note of midi) {
            expect(Number.isInteger(note)).toBe(true);
            expect(note).toBeGreaterThanOrEqual(48);
            expect(note).toBeLessThanOrEqual(84);
          }
        }
        const seconds = Math.max(...clip.events.map(e => e.beat + e.duration)) * 60 / clip.bpm;
        expect(seconds, clip.id).toBeLessThanOrEqual(12);
      }
    }
    expect(new Set(clipIds).size).toBe(clipIds.length);
  });

  it('matches all eight rhythm answers to their actual quarter-unit onset and duration patterns', () => {
    const fixtures = [
      ['34', 1, [1, 1, 1, 1], '4분음표 네 개'],
      ['34', 2, [0.5, 0.5, 1, 2], '8분음표 둘, 4분음표 하나, 2분음표 하나'],
      ['34', 3, [2, 1, 1], '긴 소리 하나 뒤에 짧은 소리 둘'],
      ['34', 4, [1, 0.5, 0.5, 1, 1], '두 번째 박'],
      ['56', 1, [1.5, 0.5, 1, 1], '점4분음표, 8분음표, 4분음표 둘'],
      ['56', 2, [0.25, 0.25, 0.25, 0.25, 1, 2], '첫 번째 박'],
      ['56', 3, [0.5, 1, 0.5, 2], '8분음표, 4분음표, 8분음표, 2분음표'],
      ['56', 4, [1, 0.5, 0.5, 0.5, 0.5, 1], '네 번째 박'],
    ] as const;
    for (const [grade, n, durations, text] of fixtures) {
      const q = get(grade, 'rhythm', n), clip = q.audio![0];
      expect(clip.events.map(e => e.duration)).toEqual(durations);
      let beat = 0;
      for (const e of clip.events) { expect(e.beat).toBe(beat); beat += e.duration; }
      expect(beat).toBe(4);
      expect(new Set(pitches(clip)).size).toBe(1);
      expect(answer(q)).toBe(text);
      const visual = q.choices[q.correct].visual;
      if (visual?.kind === 'score') {
        const lengths = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };
        expect(visual.notes.map(note => lengths[note.duration] * (note.dots ? 1.5 : 1))).toEqual(durations);
      }
    }
  });

  it('encodes the remaining rest passages with their intended note and rest positions', () => {
    for (const [grade, n, starts, lengths, text] of [
      ['34', 1, [0, 2, 3], [1, 1, 1], '두 번째 박'],
      ['56', 1, [0, 0.5, 2, 3], [0.5, 0.5, 1, 1], '한 박'],
    ] as const) {
      const q = get(grade, 'rest', n);
      expect(q.audio![0].events.map(e => e.beat)).toEqual(starts);
      expect(q.audio![0].events.map(e => e.duration)).toEqual(lengths);
      expect(answer(q)).toBe(text);
    }
  });

  it('anchors the opening rest to four complete audible preparation beats, not the fourth attack or decay', () => {
    const q = get('34', 'rest', 2), clip = q.audio![0];
    expect(q.lessonId).toBe('rest');
    expect(q.audio).toHaveLength(1);
    expect(clip.instrument).toBe('piano');
    expect(clip.bpm).toBe(96);
    expect(clip.events.slice(0, 4)).toEqual([0, 1, 2, 3].map(beat => ({ beat, duration: 0.2, midi: 48, velocity: 0.45 })));
    expect(clip.events.slice(4)).toEqual([
      { beat: 5, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ]);
    const preparationEnd = clip.events[3].beat + 1;
    expect(preparationEnd).toBe(4);
    expect(clip.events[4].beat - preparationEnd).toBe(1);
    expect(answer(q)).toBe('준비박 뒤에 한 박을 쉰 뒤 시작한다');
    expect(q.prompt).toContain('네 번째 준비박의 한 박을 끝까지');
  });

  it('assesses the post-rest onset on the second beat offbeat, independently of sample decay', () => {
    const q = get('56', 'rest', 2), clip = q.audio![0];
    expect(q.lessonId).toBe('rest');
    expect(q.audio).toHaveLength(1);
    expect(clip.instrument).toBe('piano');
    expect(clip.bpm).toBe(96);
    expect(clip.events.slice(0, 4)).toEqual([0, 1, 2, 3].map(beat => ({ beat, duration: 0.2, midi: 48, velocity: 0.45 })));
    const passage = clip.events.slice(4);
    expect(passage.map(e => e.beat)).toEqual([4, 5.5, 6, 7]);
    expect(passage.map(e => e.beat - passage[0].beat)).toEqual([0, 1.5, 2, 3]);
    expect(passage.map(e => e.duration)).toEqual([1, 0.5, 1, 1]);
    expect(passage.every(e => e.midi === 67 && e.velocity === 0.5)).toBe(true);
    expect(answer(q)).toBe('둘째 박의 뒤쪽 반 박 시작');
    expect(q.prompt).toContain('시작하나요');
    expect(q.prompt).not.toMatch(/소리가 끝|얼마나 쉬/);
    expect(q.why).not.toMatch(/소리가 끝|소리가 한 박 동안/);
  });

  it('requires listening rather than eliminating both timbre distractors in the prompt', () => {
    const q = get('34', 'timbre', 4);
    expect(q.choices.map(c => c.text)).toEqual(['악기의 음색', '가락의 음높이 순서', '박의 빠르기']);
    expect(q.prompt).not.toMatch(/음색|같|유지|변하지|그대로/);
    expect(answer(q)).toBe('악기의 음색');
  });

  it('grounds pitch and melody answers in the actual notes', () => {
    for (const [grade, lesson, n, notes, text] of [
      ['34', 'pitch', 1, [60, 72], '두 번째 소리'],
      ['34', 'pitch', 2, [67, 67], '높이가 같다'],
      ['56', 'pitch', 1, [60, 72], '한 옥타브 높아진다'],
      ['56', 'pitch', 2, [72, 60, 67], '두 번째 소리'],
      ['34', 'melody', 1, [60, 62, 64, 65], '차례로 올라간다'],
      ['34', 'melody', 2, [67, 65, 64, 62], '차례로 내려간다'],
      ['56', 'melody', 1, [60, 64, 62, 60], '첫째 음에서 둘째 음으로 갈 때'],
      ['56', 'melody', 2, [60, 62, 64, 60], '끝음이 처음 음과 같다'],
    ] as const) {
      const q = get(grade, lesson, n);
      expect(pitches(q.audio![0])).toEqual(notes);
      expect(answer(q)).toBe(text);
    }
  });

  it('changes only BPM for tempo pairs and only velocity for dynamics pairs', () => {
    for (const [grade, n] of [['34', 1], ['34', 2], ['56', 1]] as const) {
        const q = get(grade, 'tempo', n), [a, b] = q.audio!;
        expect(q.audio).toHaveLength(2);
        expect(a.instrument).toBe(b.instrument);
        expect(a.events).toEqual(b.events);
        expect([a.bpm, b.bpm]).toEqual(n === 1 ? [72, 120] : [120, 72]);
        expect(answer(q)).toBe(n === 1 ? '소리 B가 더 빠르다' : '소리 B가 더 느리다');
    }
    for (const n of [1, 2]) {
        const d = get('34', 'dynamics', n), [quiet, loud] = d.audio!;
        expect(d.audio).toHaveLength(2);
        expect(quiet.instrument).toBe(loud.instrument);
        expect(quiet.bpm).toBe(loud.bpm);
        expect(quiet.events.map(({ velocity: _v, ...e }) => e)).toEqual(loud.events.map(({ velocity: _v, ...e }) => e));
        expect(quiet.events.map(e => e.velocity)).toEqual(n === 1 ? [0.25, 0.25, 0.25, 0.25] : [0.65, 0.65, 0.65, 0.65]);
        expect(loud.events.map(e => e.velocity)).toEqual(n === 1 ? [0.65, 0.65, 0.65, 0.65] : [0.25, 0.25, 0.25, 0.25]);
        expect(answer(d)).toBe(n === 1 ? '소리 B가 더 세다' : '소리 B가 더 여리다');
    }
  });

  it.each([
    [1, [0.2, 0.35, 0.5, 0.65], '점점 세게'],
    [2, [0.65, 0.5, 0.35, 0.2], '점점 여리게'],
  ] as const)('teaches gradual dynamics within one grade 5-6 clip (%i), not another AB contrast', (n, velocities, text) => {
    const q = get('56', 'dynamics', n);
    expect(q.audio).toHaveLength(1);
    const clip = q.audio![0];
    expect(clip.instrument).toBe('piano');
    expect(clip.bpm).toBe(96);
    expect(clip.events.map(e => e.beat)).toEqual([0, 1, 2, 3]);
    expect(clip.events.map(e => e.duration)).toEqual([1, 1, 1, 1]);
    expect(pitches(clip)).toEqual([60, 60, 60, 60]);
    expect(clip.events.map(e => e.velocity)).toEqual(velocities);
    expect(q.choices.map(c => c.text)).toEqual(['점점 세게', '점점 여리게', '같은 세기']);
    expect(answer(q)).toBe(text);
  });

  it('teaches slowing beat starts with increasing onset intervals and identical short notes', () => {
    const q = get('56', 'tempo', 2);
    expect(q.audio).toHaveLength(1);
    const clip = q.audio![0];
    expect(clip.instrument).toBe('piano');
    expect(clip.bpm).toBe(96);
    const onsets = clip.events.map(e => e.beat);
    expect(onsets).toEqual([0, 1, 2.3, 3.9, 5.8]);
    const intervals = onsets.slice(1).map((beat, i) => beat - onsets[i]);
    for (let i = 0; i < intervals.length; i++) {
      expect(intervals[i]).toBeCloseTo([1, 1.3, 1.6, 1.9][i]);
      if (i > 0) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
    expect(clip.events.every(e => e.midi === 60 && e.velocity === 0.5 && e.duration === 0.18)).toBe(true);
    expect(q.prompt).toContain('각 소리는 한 박의 시작');
    expect(answer(q)).toBe('점점 느려진다');
  });

  it('matches timbre event parameters for reference, odd-one-out, pair and family tasks, not acoustic equivalence', () => {
    for (const [grade, n, instruments, text] of [
      ['34', 1, ['piano', 'flute', 'piano'], '소리 C'],
      ['34', 2, ['violin', 'cello', 'violin'], '소리 B'],
      ['34', 3, ['flute', 'flute', 'flute', 'clarinet'], 'A와 B는 같고, C와 D는 다르다'],
      ['34', 4, ['cello', 'trumpet'], '악기의 음색'],
      ['56', 1, ['flute', 'clarinet'], '둘 다 목관악기'],
      ['56', 2, ['violin', 'cello'], '둘 다 현악기'],
      ['56', 3, ['trumpet', 'clarinet'], 'A는 금관악기, B는 목관악기'],
      ['56', 4, ['piano', 'trumpet', 'piano'], '소리 C'],
    ] as const) {
      const q = get(grade, 'timbre', n);
      expect(q.audio!.map(c => c.instrument)).toEqual(instruments);
      for (const clip of q.audio!.slice(1)) {
        expect(clip.events).toEqual(q.audio![0].events);
        expect(clip.bpm).toBe(q.audio![0].bpm);
      }
      expect(answer(q)).toBe(text);
    }
  });

  it('distinguishes simultaneous chords from an arpeggio of the same notes', () => {
    for (const grade of ['34', '56']) {
      const q = get(grade, 'harmony', 1), [a, b] = q.audio!;
      expect(a.instrument).toBe(b.instrument);
      expect(a.bpm).toBe(b.bpm);
      expect(a.events).toEqual([{ beat: 0, duration: 3, midi: [60, 64, 67], velocity: 0.5 }]);
      expect(b.events.map(e => e.midi)).toEqual([60, 64, 67]);
      expect(b.events.map(e => [e.beat, e.duration])).toEqual([[0, 1], [1, 1], [2, 1]]);
      expect(answer(q)).toBe(grade === '34' ? 'A는 함께, B는 차례로 울린다' : 'A는 도·미·솔을 동시에, B는 같은 음들을 차례로 연주한다');
    }
  });

  it('makes AB and ABA form answers audible at the stated equal-length boundaries', () => {
    for (const [grade, expected, text] of [
      ['34', [[60, 62, 64, 60], [67, 65, 62, 67]], '서로 다른 두 부분'],
      ['56', [[60, 62, 64, 60], [67, 65, 62, 67], [60, 62, 64, 60]], 'aba'],
    ] as const) {
      const q = get(grade, 'form', 1), clip = q.audio![0];
      expect(clip.bpm).toBe(120);
      expect(clip.events.map(e => e.beat)).toEqual(Array.from({ length: expected.length * 4 }, (_, i) => i));
      expect(clip.events.every(e => e.duration === 1 && e.velocity === 0.5)).toBe(true);
      expect(expected.map((_, i) => pitches(clip).slice(i * 4, i * 4 + 4))).toEqual(expected);
      expect(answer(q)).toBe(text);
    }
  });
});
