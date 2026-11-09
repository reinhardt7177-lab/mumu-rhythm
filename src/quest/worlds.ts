import { songs } from '../content/songs';
import type { Song } from '../types';

export interface MusicalWorld {
  id: string;
  era: string;
  title: string;
  songId: string;
  background: string;
  actors: string;
  enemyNames: [string,string,string,string];
  accent: string;
  surface: string;
  introduction: string;
  stops: string[];
  atmosphere: string;
}

export const WORLDS: MusicalWorld[] = [
  {
    id:'past',era:'과거',title:'황금빛 극장의 밤',songId:'can-can',
    actors:'/assets/art/actors-v3/past.png',enemyNames:['태엽 오르골','가면의 메아리','파이프오르간 골렘','극장의 유령 지휘자'],
    background:'/assets/art/worlds-v2/past.webp',accent:'#ffd276',surface:'#352331',
    introduction:'오펜바흐의 「천국과 지옥」에 나오는 신나는 춤곡이에요. 짧은 가락이 되풀이되며 관현악의 소리가 힘차게 어우러져요.',
    stops:['붉은 커튼','별의 객석','황금 무대','마지막 앙코르'],atmosphere:'붉은 커튼 너머, 잠든 극장의 막이 오른다.',
  },
  {
    id:'present',era:'현재',title:'구름 위 옥상 산책',songId:'cloud-hop',
    actors:'/assets/art/actors-v3/present.png',enemyNames:['통통 스피커','카세트 유령','붐박스 로봇','옥상의 디제이'],
    background:'/assets/art/worlds-v2/present.webp',accent:'#9ee8d2',surface:'#203d43',
    introduction:'게임을 위해 만든 오리지널 신스 곡이에요. 서로 묻고 대답하는 짧은 가락과 반짝이는 전자악기 소리를 들어 보세요.',
    stops:['작은 옥상','구름 정거장','햇살 광장','도시의 합주'],atmosphere:'구름을 따라, 도시에 잃어버린 리듬을 돌려주자.',
  },
  {
    id:'future',era:'미래',title:'별을 잇는 네온 궤도',songId:'neon-run',
    actors:'/assets/art/actors-v3/future.png',enemyNames:['궤도 드론','홀로그램 음표','신시사이저 메카','은하의 지휘자'],
    background:'/assets/art/worlds-v2/future.webp',accent:'#a8e7ff',surface:'#272b45',
    introduction:'드럼 머신과 신시사이저로 만든 오리지널 곡이에요. 베이스·패드·리드가 층층이 쌓였다가 다시 모이는 순간을 찾아보세요.',
    stops:['궤도 입구','은하 통로','빛의 관제실','별의 지휘대'],atmosphere:'별과 별 사이를 잇는, 새로운 소리의 항해.',
  },
  {
    id:'fantasy',era:'판타지',title:'별빛 숲의 작은 기사',songId:'william-tell',
    actors:'/assets/art/actors-v3/fantasy.png',enemyNames:['별무늬 버섯','보랏빛 잎 정령','수정의 수호자','달빛 숲의 마법사'],
    background:'/assets/art/quest-v1/forest.webp',accent:'#bce49c',surface:'#20372e',
    introduction:'로시니의 「윌리엄 텔」 서곡 중 힘차게 달리는 마지막 부분이에요. 금관악기의 밝은 신호와 마디의 첫 박을 받쳐 주는 낮은 소리를 들어 보세요.',
    stops:['메아리 숲','악보의 유적','침묵의 성문','마왕의 방'],atmosphere:'별빛 숲 너머, 잠든 왕국의 소리를 찾아서.',
  },
];

export function songForWorld(id: string): Song {
  const world = WORLDS.find(w=>w.id===id);
  const song = songs.find(s=>s.id===world?.songId);
  if (!song) throw new Error(`Unknown world: ${id}`);
  return song;
}

export interface Question { q:string; a:string[]; correct:number; why:string }
export function questionsFor(song: Song): Question[] {
  return [
    {q:song.mission.question,a:song.mission.options,correct:song.mission.answerIndex,why:song.mission.hint},
    {q:'같은 리듬이나 가락이 다시 나오는 것은?',a:['쉼','반복','음색'],correct:1,why:'같은 리듬이나 가락이 다시 나타나는 것을 반복이라고 해요.'},
    {q:'악보의 f(포르테)는 어떻게 연주하라는 뜻일까요?',a:['아주 느리게','소리 없이','강하게'],correct:2,why:'포르테(f)는 강하게, 피아노(p)는 약하게 연주하라는 뜻이에요.'},
  ];
}
