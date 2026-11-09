import {describe,expect,it} from 'vitest';
import {WORLDS} from './worlds';
import {heroFrame,enemyFrame} from './actors';

describe('world character assets',()=>{
  it('has a separate sprite atlas and four named enemies for every era',()=>{
    expect(new Set(WORLDS.map(w=>w.actors)).size).toBe(4);
    for(const world of WORLDS){expect(world.actors).toMatch(/actors-v3\/.*\.png$/);expect(world.enemyNames).toHaveLength(4);expect(new Set(world.enemyNames).size).toBe(4);}
    expect(new Set(WORLDS.flatMap(w=>w.enemyNames)).size).toBe(16);
  });
  it('uses idle frames separately from windup and release',()=>{
    expect(heroFrame(-1,0,false)).toBe(0);
    expect(heroFrame(-1,.4,false)).toBe(1);
    expect(heroFrame(0,0,false)).toBe(2);
    expect(heroFrame(.09,0,false)).toBe(3);
    expect(heroFrame(.4,0,false)).toBe(0);
    expect(heroFrame(-1,10,true)).toBe(0);
    expect(heroFrame(-1,-.2,false)).toBe(0);
  });
  it('selects each enemy pair without leaking into a different creature',()=>{
    for(let stage=0;stage<4;stage++){expect(enemyFrame(stage,false)).toBe(4+stage*2);expect(enemyFrame(stage,true)).toBe(5+stage*2);}
    expect(()=>enemyFrame(4,false)).toThrow();
  });
});
