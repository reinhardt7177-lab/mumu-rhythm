import { describe, it, expect } from 'vitest';
import { Combat } from './combat';
describe('musical combat', () => {
  it('cannot defeat the boss without musical input', () => { const c=new Combat(); c.update(1); expect(c.won).toBe(false); expect(c.stage).toBe(0); });
  it('gates enemies by song progress and awards a full clear', () => {
    const c=new Combat();
    for(let s=0;s<4;s++) { c.update(s*.24); for(let n=1;n<40;n++) c.hit(true,n); }
    expect(c.kills).toBe(4); expect(c.won).toBe(true);
  });
  it('does not skip a dead enemy before its next phrase', () => { const c=new Combat(); for(let i=0;i<30;i++)c.hit(true,1); c.update(.1);expect(c.stage).toBe(0); c.update(.24);expect(c.stage).toBe(1); });
});
