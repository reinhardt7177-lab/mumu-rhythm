import {describe,it,expect} from 'vitest';
import {doubleScroll} from './scrollSpeed';
import {songs} from '../content/songs';
import {extraSongs} from '../content/extraSongs';
import {DEFAULT_APPROACH_SECONDS} from './judge';
import {trackY,TRACK} from '../quest/noteTrackGeometry';
describe('double falling-bar speed, not double music speed',()=>{
 it.each([...songs,...extraSongs])('$id halves visible approach without moving the music or hit time',song=>{
  const fast=doubleScroll(song),original=song.approachSeconds??DEFAULT_APPROACH_SECONDS;
  expect(fast.approachSeconds).toBe(original/2);
  expect(TRACK.hitlineY-trackY(.4,fast.approachSeconds!)).toBeCloseTo(2*(TRACK.hitlineY-trackY(.4,original)));
  expect(trackY(0,fast.approachSeconds!)).toBe(TRACK.hitlineY);
  expect(fast.bpm).toBe(song.bpm);
  expect(fast.melody).toBe(song.melody);
  expect(fast.sections).toBe(song.sections);
  expect(fast.totalBeats).toBe(song.totalBeats);
  expect(fast.backingTrack).toBe(song.backingTrack);
  expect(song.approachSeconds).toBe(original);
 });
 it('uses the same default as rendering and direct input',()=>{
  const song={...songs[0],approachSeconds:undefined};
  expect(doubleScroll(song).approachSeconds).toBe(DEFAULT_APPROACH_SECONDS/2);
  expect(song.approachSeconds).toBeUndefined();
 });
});
