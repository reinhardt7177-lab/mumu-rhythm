import {describe,it,expect} from 'vitest';
import {feedbackKind,FEEDBACK,frameIndex,finaleRemaining} from './feedback';
import {Combat} from './combat';

describe('five distinct musical feedback tiers',()=>{
 it('resolves normal, perfect, hold, combo and boss in explicit priority order',()=>{
  expect(feedbackKind(false,1,false)).toBe('normal');expect(feedbackKind(true,1,false)).toBe('perfect');
  expect(feedbackKind(true,1,true)).toBe('hold');expect(feedbackKind(true,8,true)).toBe('combo');
  expect(feedbackKind(true,8,true,true)).toBe('boss');
  expect(new Set(Object.values(FEEDBACK).map(p=>p.asset)).size).toBe(5);
 });
 it('scales recoil and duration without moving the musical clock',()=>{
  expect(FEEDBACK.normal.shake).toBe(0);expect(FEEDBACK.perfect.kick).toBeGreaterThan(FEEDBACK.normal.kick);
  expect(FEEDBACK.boss.duration).toBeGreaterThan(FEEDBACK.combo.duration);
  for(const p of Object.values(FEEDBACK))expect(p.kick).toBeLessThanOrEqual(12);
 });
 it('uses the zap contact pivot instead of a ground-based burst offset',()=>{
  expect(FEEDBACK.hold.centerOffset).toBe(0);
  expect(FEEDBACK.normal.centerOffset).toBe(20);
  expect(FEEDBACK.combo.centerOffset).toBe(28);
 });
 it('loops held effects but ends one-shots instead of leaving the last frame stuck',()=>{
  expect(frameIndex(0,30,16,false)).toBe(0);expect(frameIndex(1,30,16,false)).toBeNull();
  expect(frameIndex(4.2,30,120,true)).toBe(6);expect(frameIndex(-.1,30,16,false)).toBeNull();
 });
 it('keeps hold identity on an attack and promotes only the actual boss-killing impact',()=>{
  const c=new Combat();const hold=c.launch(true,1,0,true)!;expect(hold.kind).toBe('hold');
  expect(c.advance(.32,0)[0].kind).toBe('hold');
  c.stage=3;c.hp=12;const last=c.launch(false,8,1)!;
  expect(last.kind).toBe('combo');expect(c.won).toBe(false);
  const impact=c.advance(1.32,.9)[0];expect(impact.kind).toBe('boss');expect(impact.defeated).toBe(true);expect(c.won).toBe(true);
 });
 it('allows a late boss effect to finish visually without adding a delay after an early kill',()=>{
  expect(finaleRemaining(undefined,80)).toBe(0);expect(finaleRemaining(60,80)).toBe(0);
  expect(finaleRemaining(79.9,80)).toBeGreaterThan(1.5);
 });
});
