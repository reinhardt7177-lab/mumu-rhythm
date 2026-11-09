import { describe, expect, it } from 'vitest';
import { Combat, ENEMIES } from './combat';

describe('song-clock impacts', () => {
  it('reacts to input immediately but deals damage only at arrival', () => {
    const c = new Combat();
    c.launch(true, 8, 1);
    expect(c.hp).toBe(ENEMIES[0].hp);
    expect(c.lastSkill).toBe('화음 폭발');
    expect(c.advance(1.31, 0)).toEqual([]);
    const impacts = c.advance(1.32, 0);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].damage).toBe(48);
    expect(c.hp).toBe(ENEMIES[0].hp - 48);
    expect(c.advance(1.5, 0)).toEqual([]);
  });

  it('does not spill attacks from a defeated enemy into the next encounter', () => {
    const c = new Combat();
    for (let i = 0; i < 12; i++) c.launch(true, 1, i * .01);
    c.advance(.45, .24);
    expect(c.kills).toBe(1);
    expect(c.stage).toBe(1);
    expect(c.hp).toBe(ENEMIES[1].hp);
    c.advance(1, .24);
    expect(c.hp).toBe(ENEMIES[1].hp);
  });

  it('ignores attacks during the wait between encounters', () => {
    const c = new Combat();
    for (let i = 0; i < 10; i++) c.hit(true, 1);
    expect(c.launch(true, 8, 2)).toBeNull();
    expect(c.advance(3, .1)).toEqual([]);
  });

  it('settles pending last-note damage before showing the ending', () => {
    const c = new Combat();
    for (let stage = 0; stage < 3; stage++) {
      c.update(stage * .24);
      for (let i = 0; i < 20; i++) c.hit(true, 1);
    }
    c.update(.72);
    for (let i = 0; i < 4; i++) c.hit(true, 8);
    c.launch(true, 8, 75.9);
    expect(c.won).toBe(false);
    expect(c.finish()).toHaveLength(1);
    expect(c.won).toBe(true);
  });

  it('isolates pending attacks when a new run is created', () => {
    const c = new Combat();
    c.launch(true, 8, 1);
    const next = new Combat();
    expect(next.advance(10, 0)).toEqual([]);
    expect(next.hp).toBe(ENEMIES[0].hp);
  });
});
