import{theaterAttack,type TheaterAttack}from'./theaterAttack';
export const WORLD_THEMES={
 present:{sprite:'/assets/art/world-attacks-v7/present/hero.png',primary:'#63f4dc',secondary:'#ff7b9e',shadow:'#223045',pattern:'soundwave',finale:'ROOFTOP OVERDRIVE',names:['키타 스타카토','스테레오 리프','도시의 화음','루프톱 사운드웨이브'],fx:{normal:'hit',perfect:'present-perfect',hold:'present-hold',combo:'present-combo',boss:'boss'},rune:'present-rune'},
 future:{sprite:'/assets/art/world-attacks-v7/future/hero.png',primary:'#8cefff',secondary:'#f68aff',shadow:'#24233f',pattern:'orbit',finale:'CONSTELLATION DRIVE',names:['신스 펄스','쌍성 궤도','별자리 화음','갤럭시 레일'],fx:{normal:'hit',perfect:'future-perfect',hold:'future-hold',combo:'future-combo',boss:'boss'},rune:'future-rune'},
 fantasy:{sprite:'/assets/art/world-attacks-v7/fantasy/hero.png',primary:'#ffe6a0',secondary:'#d4a9ff',shadow:'#2b2b38',pattern:'harp',finale:'STARSONG BLOSSOM',names:['하프의 속삭임','두 줄의 별빛','숲의 삼화음','별무리의 노래'],fx:{normal:'hit',perfect:'fantasy-perfect',hold:'fantasy-hold',combo:'fantasy-combo',boss:'boss'},rune:'fantasy-rune'},
}as const;
export type ThemeWorld=keyof typeof WORLD_THEMES;
export type WorldTheme=typeof WORLD_THEMES[ThemeWorld];
export function worldTheme(id:string):WorldTheme|undefined{return Object.hasOwn(WORLD_THEMES,id)?WORLD_THEMES[id as ThemeWorld]:undefined;}
export function worldAttack(id:ThemeWorld,combo:number){const base=theaterAttack(combo),theme=WORLD_THEMES[id];return{...base,name:base.finale?theme.finale:theme.names[base.tier]};}
export function worldFlightPoint(id:ThemeWorld,p:number,voice:number,profile:TheaterAttack,from:{x:number;y:number},to:{x:number;y:number}){
 if(p<=0)return{...from};if(p>=1)return{...to};
 const rank=voice-(profile.voices-1)/2,arc=Math.sin(p*Math.PI),stagger=Math.max(0,Math.min(1,p+rank*.045*arc));
 const offset=id==='present'?Math.sin(p*Math.PI*3+rank*.8)*arc*(12+profile.tier*3)+rank*arc*16
  :id==='future'?Math.cos(p*Math.PI*2+voice*1.4)*arc*(14+profile.tier*7)+rank*arc*13
  :-arc*(22+Math.abs(rank)*17)+Math.sin(p*Math.PI*2)*rank*9;
 return{x:from.x+(to.x-from.x)*stagger,y:from.y+(to.y-from.y)*p+offset};
}
