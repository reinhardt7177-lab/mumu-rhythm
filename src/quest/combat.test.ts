import { describe, it, expect } from 'vitest';
import { Combat, COUNTER_FLIGHT_SECONDS } from './combat';
describe('musical combat', () => {
  it('cannot defeat the boss without musical input', () => { const c=new Combat(); c.update(1); expect(c.won).toBe(false); expect(c.stage).toBe(0); });
  it('gates enemies by song progress and awards a full clear', () => {
    const c=new Combat();
    for(let s=0;s<4;s++) { c.update(s*.24); for(let n=1;n<40;n++) c.hit(true,n); }
    expect(c.kills).toBe(4); expect(c.won).toBe(true);
  });
  it('does not skip a dead enemy before its next phrase', () => { const c=new Combat(); for(let i=0;i<30;i++)c.hit(true,1); c.update(.1);expect(c.stage).toBe(0); c.update(.24);expect(c.stage).toBe(1); });
  it('launches a counter on a miss and applies damage only once at contact', () => {
    const c = new Combat();
    c.miss(2, 10);
    const at = 2 + COUNTER_FLIGHT_SECONDS;
    expect(c.counterattack).toMatchObject({ time: 2, at, target: 0, damage: 10 });
    c.miss(2.1, 10);
    c.advance(at - .01, .1);
    expect(c.energy).toBe(100);
    c.advance(at, .1);
    expect(c.energy).toBe(90);
    c.advance(at + .1, .1);
    expect(c.energy).toBe(90);
  });
  it('cancels a pending counter if its enemy is defeated first', () => {
    const c = new Combat(undefined, [12, 20, 30]);
    c.launch(true, 1, 1);
    c.miss(1.1);
    c.advance(2, .24);
    expect(c.stage).toBe(1);
    expect(c.counterattack).toBeUndefined();
    expect(c.energy).toBe(100);
  });
  it('keeps playing at zero energy and rewards the next correct notes with recovery', () => {
    const c = new Combat();
    for (let i = 0; i < 15; i++) {
      c.miss(i, 10);
      c.advance(i + COUNTER_FLIGHT_SECONDS, .1);
    }
    expect(c.energy).toBe(0);
    expect(c.launch(false, 1, 16)).not.toBeNull();
    expect(c.energy).toBe(2);
    c.launch(true, 2, 17);
    expect(c.energy).toBe(5);
  });
  it('does not land a counter after the song ends', () => {
    const c = new Combat();
    c.miss(3);
    c.finish();
    expect(c.counterattack).toBeUndefined();
    expect(c.energy).toBe(100);
  });
});
