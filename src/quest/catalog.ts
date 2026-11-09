import {songs} from '../content/songs';
import type {Song} from '../types';
import {WORLDS} from './worlds';
import {extraSongs,extraSongInfo} from '../content/extraSongs';

export interface LibrarySong {song:Song;worldId:string;introduction:string;sourceUrl?:string;license:string;performer?:string;credit:string;licenseUrl?:string;changes?:string}
const mapping:Record<string,string>={'can-can':'past','turkish-march':'past','hungarian-dance':'past','cloud-hop':'present','neon-run':'future','robot-parade':'future','william-tell':'fantasy'};
const credits:Record<string,{license:string;credit:string;sourceUrl?:string}>={
 'can-can':{license:'Public-domain dedication',credit:'Jacques Offenbach / Musopen recording. Game excerpt, fades and normalization.',sourceUrl:'https://commons.wikimedia.org/wiki/File:Offenbach_-_Orpheus_in_the_Underworld_-_Overture,_Can_Can_section.ogg'},
 'william-tell':{license:'US federal government work / Public Domain',credit:'G. Rossini / United States Marine Corps Band, 2000. Game excerpt, fades and normalization.',sourceUrl:'https://commons.wikimedia.org/wiki/File:Gioachino_Rossini,_William_Tell_Overture_(military_band_version,_2000).ogg'},
 'turkish-march':{license:'CC BY 3.0',credit:'W. A. Mozart / Eduardo, IMSLP recording #111573. Edited classroom excerpt with fades and normalization.',sourceUrl:'https://imslp.org/wiki/Piano_Sonata_No.11_in_A_major%2C_K.331%2F300i_%28Mozart%2C_Wolfgang_Amadeus%29'},
};
const order=['can-can','turkish-march','william-tell','cloud-hop','neon-run','robot-parade'];
export const MUSIC_LIBRARY:LibrarySong[]=[
 ...order.map(id=>{const song=songs.find(s=>s.id===id)!;return {song,worldId:mapping[id],introduction:WORLDS.find(w=>w.songId===id)?.introduction??song.mission.description,...(credits[id]??{license:'MUMU Original',credit:`${song.title} / MUMU original score and synthesis; no third-party samples.`})};}),
 ...extraSongs.map(song=>{const info=extraSongInfo[song.id];return {song,worldId:info.worldId??'past',...info};}),
];
export function librarySong(id:string):LibrarySong {
  const item=MUSIC_LIBRARY.find(entry=>entry.song.id===id);
  if(!item)throw new Error(`Unknown song: ${id}`);
  return item;
}
