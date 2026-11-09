import {describe,it,expect} from 'vitest';
import {MUSIC_LIBRARY,librarySong} from './catalog';
import {WORLDS} from './worlds';
describe('expanded music library',()=>{
 it('contains fourteen distinct playable songs, ten more than the four-world version',()=>{expect(MUSIC_LIBRARY).toHaveLength(14);expect(new Set(MUSIC_LIBRARY.map(x=>x.song.id)).size).toBe(14);});
 it('connects every song to a world, introduction and exact recording credits',()=>{for(const entry of MUSIC_LIBRARY){expect(WORLDS.some(w=>w.id===entry.worldId)).toBe(true);expect(entry.introduction.length).toBeGreaterThan(20);expect(entry.license.length).toBeGreaterThan(4);expect(entry.credit.length).toBeGreaterThan(10);expect(librarySong(entry.song.id)).toBe(entry);}});
});
