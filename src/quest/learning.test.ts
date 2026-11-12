import { describe, expect, it } from 'vitest';
import { MUSIC_LIBRARY } from './catalog';
import { learningFor, type GradeBand } from './learning';

const ids = ['can-can', 'turkish-march', 'william-tell', 'cloud-hop', 'neon-run',
  'robot-parade', 'bach-prelude', 'beethoven-fifth', 'morning-mood', 'mountain-king',
  'borodin-scherzo', 'brahms-tragic', 'tchaikovsky-march', 'bach-fugue', 'rooftop-swing', 'moonlight-waltz'];
const bands: GradeBand[] = ['3-4', '5-6'];

describe('elementary music learning packs', () => {
  it('covers the complete playable library, not the unused legacy song', () => {
    expect(MUSIC_LIBRARY.map(x => x.song.id).sort()).toEqual([...ids].sort());
  });

  for (const id of ids) for (const grade of bands) {
    it(`${id} / ${grade}: teaches three notes and five valid questions`, () => {
      const pack = learningFor(id, grade);
      expect(pack.grade).toBe(grade);
      expect(pack.concepts).toHaveLength(3);
      expect(pack.questions).toHaveLength(5);
      expect(new Set(pack.questions.map(x => x.q)).size).toBe(5);
      expect(new Set(pack.questions.map(x => x.concept)).size).toBe(5);
      for (const note of pack.concepts) {
        expect(note.title.trim().length).toBeGreaterThan(0);
        expect(note.body.trim().length).toBeGreaterThan(30);
      }
      for (const question of pack.questions) {
        expect(question.a).toHaveLength(3);
        expect(new Set(question.a.map(a => a.trim())).size).toBe(3);
        expect(question.a.every(a => a.trim().length > 0)).toBe(true);
        expect(Number.isInteger(question.correct)).toBe(true);
        expect(question.correct).toBeGreaterThanOrEqual(0);
        expect(question.correct).toBeLessThan(question.a.length);
        expect(question.why.trim().length).toBeGreaterThan(20);
        expect(pack.concepts.some(c => c.title.includes(question.concept))).toBe(true);
      }
      expect(pack.sourceUrls).toContain('https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=0302');
      expect(JSON.stringify(pack)).not.toMatch(/대위법|딸림화음|으뜸화음|소나타 형식|beatsPerBar/);
    });
  }

  it('uses genuinely different grade tasks, with varied song-specific topic selections', () => {
    for (const id of ids) {
      const lower = learningFor(id);
      const upper = learningFor(id, '5-6');
      expect(lower.grade).toBe('3-4');
      expect(lower.questions.every(q => !upper.questions.some(u => u.q === q.q))).toBe(true);
      expect(upper.questions.every(q => /예시|계획|비교|조건/.test(q.q))).toBe(true);
    }
    for (const grade of bands) {
      const packs = ids.map(id => learningFor(id, grade));
      expect(new Set(packs.map(p => p.questions.map(q => q.concept).join('|'))).size).toBe(ids.length);
      expect(new Set(packs.flatMap(p => p.questions.map(q => q.q))).size).toBeGreaterThanOrEqual(20);
      expect(packs.some(p => p.questions.every(q => !/포르테/.test(q.q)))).toBe(true);
    }
  });

  it('keeps duration relative and chords distinct from a sequence', () => {
    const duration = learningFor('beethoven-fifth').questions.find(q => q.concept === '음표의 상대 길이')!;
    expect(duration.why).toContain('2배');
    const chord = learningFor('bach-prelude').questions.find(q => q.concept === '화음과 차례로 나는 음')!;
    expect(chord.a[chord.correct]).toContain('동시에');
    expect(chord.why).toContain('차례');
  });

  it('returns safe neutral unknown-song packs and fresh independent values', () => {
    for (const id of ['unknown', '', '__proto__', 'constructor']) {
      for (const grade of bands) {
        const pack = learningFor(id, grade);
        expect(pack.grade).toBe(grade);
        expect(pack.questions).toHaveLength(5);
        expect(pack.concepts).toHaveLength(3);
        expect(JSON.stringify(pack)).not.toContain('undefined');
        expect(JSON.stringify(pack)).not.toContain(id === '' ? '__missing__' : id);
      }
    }
    const pack = learningFor('can-can');
    const before = learningFor('can-can');
    pack.questions[0].a[0] = 'changed';
    pack.concepts[0].body = 'changed';
    pack.sourceUrls.length = 0;
    expect(learningFor('can-can')).toEqual(before);
  });
});
