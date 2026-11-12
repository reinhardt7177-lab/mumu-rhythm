import {describe,it,expect} from 'vitest';
import {MUSIC_LIBRARY,librarySong} from './catalog';
import {WORLDS} from './worlds';
import {quizFor} from './bank';
describe('expanded music library',()=>{
 it('contains sixteen distinct playable songs',()=>{expect(MUSIC_LIBRARY).toHaveLength(16);expect(new Set(MUSIC_LIBRARY.map(x=>x.song.id)).size).toBe(16);});
 it('connects every song to a world, introduction and exact recording credits',()=>{for(const entry of MUSIC_LIBRARY){expect(WORLDS.some(w=>w.id===entry.worldId)).toBe(true);expect(entry.introduction.length).toBeGreaterThan(20);expect(entry.license.length).toBeGreaterThan(4);expect(entry.credit.length).toBeGreaterThan(10);expect(librarySong(entry.song.id)).toBe(entry);}});
 it.each([['rooftop-swing','present'],['moonlight-waltz','fantasy']])('connects %s to its world, original credit and related listening quiz', (id,world)=>{
  const entry=librarySong(id);
  expect(entry.worldId).toBe(world);
  expect(entry.credit).toContain(entry.song.title);
  expect(entry.license).toBe('MUMU Original');
  for(const grade of ['3-4','5-6'] as const){
   const quiz=quizFor(id,grade);
   expect(quiz).toHaveLength(5);
   expect(quiz[1].audio?.length).toBeGreaterThan(0);
   expect(['rhythm','pulse','timbre','harmony','melody']).toContain(quiz[1].lessonId);
  }
 });
});
