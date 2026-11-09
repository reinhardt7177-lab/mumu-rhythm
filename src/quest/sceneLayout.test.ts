import {describe,it,expect} from 'vitest';
import {WORLDS} from './worlds';
import {sceneActors,previewScene,spriteRect} from './sceneLayout';

describe('world stage placement',()=>{
 it('places the rooftop cast on the note tiles, not the front ledge',()=>{
  const p=sceneActors('present',0);
  expect(p.hero).toEqual({x:100,y:224});
  expect(p.enemy).toEqual({x:370,y:224});
  expect(p.groundY).toBe(224);
 });
 it('uses the actual floor of each background instead of a common 77% baseline',()=>{
  expect(WORLDS.map(w=>sceneActors(w.id,0).groundY)).toEqual([274,224,212,226]);
 });
 it('keeps every cast fully inside the battle canvas, including boss recoil',()=>{
  for(const w of WORLDS)for(let stage=0;stage<4;stage++){
   const p=sceneActors(w.id,stage);
   for(const [anchor,size]of [[p.hero,128],[{x:p.enemy.x+12,y:p.enemy.y},stage===3?160:128]] as const){
    const rect=spriteRect(anchor,size);
    expect(rect.x).toBeGreaterThanOrEqual(8);expect(rect.x+rect.width).toBeLessThanOrEqual(472);
    expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.y+rect.height).toBeLessThanOrEqual(320);
    expect(rect.y+size*120/128).toBeCloseTo(anchor.y);
   }
  }
 });
 it('gives floating creatures a deliberate lift while retaining the floor anchor',()=>{
  expect(sceneActors('present',1).enemy.y).toBeLessThan(sceneActors('present',1).groundY);
  expect(sceneActors('future',0).enemy.y).toBeLessThan(sceneActors('future',0).groundY);
  expect(sceneActors('fantasy',3).enemy.y).toBe(sceneActors('fantasy',3).groundY);
 });
 for(const [width,height,size]of [[1080,900,160],[390,456,112],[320,400,112],[2200,720,160],[480,250,128]]){
  it(`keeps preview actors visible and attached to the transformed floor at ${width}x${height}`,()=>{
   for(const w of WORLDS){
    const p=previewScene(w.id,width,height,size,size),world=sceneActors(w.id,0);
    const scale=p.background.width/480;
    expect(p.hero.y).toBeCloseTo(world.hero.y*scale+p.background.y);
    expect(p.enemy.y).toBeCloseTo(world.enemy.y*scale+p.background.y);
    for(const a of [p.hero,p.enemy]){expect(a.x-size/2).toBeGreaterThanOrEqual(8);expect(a.x+size/2).toBeLessThanOrEqual(width-8);expect(a.y).toBeGreaterThan(size*120/128);expect(a.y).toBeLessThan(height-8);}
    expect(p.enemy.x-p.hero.x).toBeGreaterThanOrEqual(size);
   }
  });
 }
});
