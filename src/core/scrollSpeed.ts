import type{Song}from'../types';
import{DEFAULT_APPROACH_SECONDS}from'./judge';
export function doubleScroll(song:Song):Song{
 return{...song,approachSeconds:(song.approachSeconds??DEFAULT_APPROACH_SECONDS)/2};
}
