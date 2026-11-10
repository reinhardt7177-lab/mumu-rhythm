import{describe,it,expect}from'vitest';
import{worldTheme,worldAttack,worldFlightPoint,WORLD_THEMES}from'./worldAttack';
import{theaterPose}from'./theaterAttack';
describe('three distinct world attack identities',()=>{
 it('keeps three casts, palettes, finale names and effect families distinct',()=>{
  expect(Object.keys(WORLD_THEMES)).toEqual(['present','future','fantasy']);
  expect(worldTheme('past')).toBeUndefined();expect(worldTheme('__proto__')).toBeUndefined();
  for(const key of ['sprite','primary','finale','pattern']as const)expect(new Set(Object.values(WORLD_THEMES).map(w=>w[key])).size).toBe(3);
  expect(new Set(Object.values(WORLD_THEMES).map(w=>w.fx.combo)).size).toBe(3);
 });
 it.each(['present','future','fantasy']as const)('%s shares exact progression and eight pose semantics without sharing attack names',id=>{
  for(const[combo,tier,voices]of [[7,0,1],[8,1,2],[24,2,3],[48,3,5],[64,3,7]])expect(worldAttack(id,combo)).toMatchObject({tier,voices});
  const profile=worldAttack(id,64);expect(profile.finale).toBe(true);expect(theaterPose(.12,profile,false)).toBe(7);expect(theaterPose(10,profile,true)).toBe(6);
 });
 it.each(['present','future','fantasy']as const)('%s converges every voice at the single original target',id=>{
  const from={x:150,y:180},to={x:340,y:160},profile=worldAttack(id,64);
  for(let v=0;v<profile.voices;v++)for(const p of [0,.2,.6,1]){
   const point=worldFlightPoint(id,p,v,profile,from,to);expect(Number.isFinite(point.x+point.y)).toBe(true);
   if(p===0)expect(point).toEqual(from);if(p===1)expect(point).toEqual(to);
  }
 });
 it('uses different mid-flight trajectories, not just different colors',()=>{
  const from={x:150,y:180},to={x:340,y:160};
  const paths=Object.keys(WORLD_THEMES).map(id=>JSON.stringify(worldFlightPoint(id as keyof typeof WORLD_THEMES,.4,0,worldAttack(id as keyof typeof WORLD_THEMES,24),from,to)));
  expect(new Set(paths).size).toBe(3);
 });
 it.each(['present','future','fantasy']as const)('%s rotates three phrases inside the same tier',id=>{
  const from={x:150,y:180},to={x:340,y:160};
  expect(new Set([24,32,40].map(combo=>JSON.stringify(worldFlightPoint(id,.4,0,worldAttack(id,combo),from,to)))).size).toBe(3);
  expect(worldAttack(id,32).name).toContain('카덴차');
 });
});
