import type { MelodyNote, Song, SongSection } from "../types";
import { producedTracks } from "./fastCharts.generated";

interface SongMetadata extends Omit<Song, "melody" | "sections" | "totalBeats"> {}

function buildSong(metadata: SongMetadata): Song {
  const produced = producedTracks[metadata.id];
  if (!produced) throw new Error(`제작된 악보를 찾을 수 없습니다: ${metadata.id}`);
  const melody: MelodyNote[] = produced.notes.map((item, index) => ({
    id: `${metadata.id}-${index}`,
    beat: item.beat,
    durationBeats: item.duration,
    midi: item.midi,
    lane: item.lane,
    phrase: `${metadata.id}-${Math.floor(index / 12) + 1}`,
    accent: item.accent,
  }));
  return {
    ...metadata,
    totalBeats: produced.totalBeats,
    melody,
    sections: produced.sections,
  };
}

export const songs: Song[] = [
  buildSong({
    id: "turkish-march",
    number: "01",
    title: "터키 행진곡",
    subtitle: "피아노의 짧은 음이 계단처럼 달려요",
    origin: "W. A. Mozart · K.331 3악장",
    grade: "4~6학년",
    difficulty: "빠른 도전",
    bpm: 144,
    beatsPerBar: 2,
    leadInBeats: 4,
    hitBank: "piano",
    featuredInstrument: "그랜드 피아노",
    listeningPoint: "짧게 끊는 음과 계단식 가락",
    instruments: ["피아노", "현악", "플루트", "팀파니"],
    approachSeconds: 3.25,
    backingTrack: "/assets/audio/v3/backing/turkish-march.ogg",
    artwork: "/assets/art/turkish-march.webp",
    palette: { ink: "#23191d", deep: "#2b1820", accent: "#34d6c4", warm: "#ef5350", mist: "#fff0c9" },
    mission: {
      eyebrow: "빠른 클래식 01",
      title: "피아노 가락의 방향을 손으로 따라가요",
      description: "짧은 음들이 위아래로 빠르게 움직입니다. 음이 높아지면 오른쪽, 낮아지면 왼쪽 레인이 나타나는지 들어 보세요.",
      question: "터키 행진곡의 빠른 피아노 가락은 주로 어떻게 움직였나요?",
      options: ["계단처럼 오르내렸어요", "한 음만 길게 이어졌어요", "박 없이 자유롭게 흘렀어요"],
      answerIndex: 0,
      hint: "피아노 건반 위에서 손이 어느 방향으로 달렸는지 떠올려 보세요.",
      badge: "피아노 질주자",
    },
  }),
  buildSong({
    id: "can-can",
    number: "02",
    title: "캉캉",
    subtitle: "현악기의 통통 튀는 리듬이 춤을 만들어요",
    origin: "J. Offenbach · 오페레타 천국과 지옥",
    grade: "4~6학년",
    difficulty: "최고 속도",
    bpm: 172,
    beatsPerBar: 2,
    leadInBeats: 4,
    hitBank: "violin",
    featuredInstrument: "바이올린",
    listeningPoint: "같은 리듬의 반복과 점점 커지는 소리",
    instruments: ["바이올린", "현악 합주", "피아노", "호른"],
    approachSeconds: 3.05,
    backingTrack: "/assets/audio/v3/backing/can-can.ogg",
    artwork: "/assets/art/can-can.webp",
    palette: { ink: "#20261d", deep: "#263127", accent: "#ffd34f", warm: "#e84b4b", mist: "#eef4d0" },
    mission: {
      eyebrow: "빠른 클래식 02",
      title: "되풀이되는 춤 리듬을 붙잡아요",
      description: "같은 짧은 리듬이 여러 번 돌아오며 악기가 하나씩 더해집니다. 반복될수록 소리가 풍성해지는지 확인해 보세요.",
      question: "캉캉을 신나게 만든 가장 큰 특징은 무엇인가요?",
      options: ["짧은 리듬의 빠른 반복", "아주 느린 한 음", "박자가 없는 연주"],
      answerIndex: 0,
      hint: "빠른 발걸음처럼 계속 되풀이된 리듬을 떠올려 보세요.",
      badge: "리듬 점프왕",
    },
  }),
  buildSong({
    id: "william-tell",
    number: "03",
    title: "윌리엄 텔 서곡",
    subtitle: "금관과 팀파니가 힘찬 질주를 시작해요",
    origin: "G. Rossini · 서곡 피날레",
    grade: "4~6학년",
    difficulty: "최고 속도",
    bpm: 160,
    beatsPerBar: 2,
    leadInBeats: 4,
    hitBank: "trumpet",
    featuredInstrument: "트럼펫",
    listeningPoint: "강한 첫 박과 금관의 신호",
    instruments: ["트럼펫", "호른", "현악", "팀파니"],
    approachSeconds: 3.15,
    backingTrack: "/assets/audio/v3/backing/william-tell.ogg",
    artwork: "/assets/art/william-tell.webp",
    palette: { ink: "#15262d", deep: "#153640", accent: "#ffda4c", warm: "#ee654c", mist: "#dff5e7" },
    mission: {
      eyebrow: "빠른 클래식 03",
      title: "마디를 여는 강한 첫 박을 찾아요",
      description: "트럼펫이 출발 신호를 보내고 낮은 악기와 팀파니가 첫 박을 밀어 줍니다. 두 박 중 어느 박이 더 무거운지 느껴 보세요.",
      question: "질주하는 느낌을 가장 힘차게 만든 소리는 무엇이었나요?",
      options: ["금관과 팀파니의 강한 첫 박", "작은 종 한 음", "소리가 없는 쉼만"],
      answerIndex: 0,
      hint: "마디가 시작될 때 둥 하고 받쳐 준 낮은 소리를 떠올려 보세요.",
      badge: "알프스 지휘자",
    },
  }),
  buildSong({
    id: "hungarian-dance",
    number: "04",
    title: "헝가리 무곡 5번",
    subtitle: "길게 머문 뒤 짧은 음들이 불꽃처럼 달려요",
    origin: "J. Brahms · 헝가리 무곡 5번",
    grade: "4~6학년",
    difficulty: "빠른 도전",
    bpm: 146,
    beatsPerBar: 2,
    leadInBeats: 4,
    hitBank: "violin",
    featuredInstrument: "바이올린",
    listeningPoint: "긴 음과 짧은 음의 극적인 대비",
    instruments: ["바이올린", "클라리넷", "현악 합주", "피아노"],
    approachSeconds: 3.3,
    backingTrack: "/assets/audio/v3/backing/hungarian-dance.ogg",
    artwork: "/assets/art/hungarian-dance.webp",
    palette: { ink: "#2a1827", deep: "#372337", accent: "#55d1c6", warm: "#df5369", mist: "#f7e2c5" },
    mission: {
      eyebrow: "빠른 클래식 04",
      title: "음의 길이가 만드는 극적인 대비를 들어요",
      description: "가락이 길게 숨을 고른 뒤 짧은 음들로 갑자기 달립니다. 긴 노트 바와 짧은 노트 바가 어떻게 바뀌는지 살펴보세요.",
      question: "헝가리 무곡의 가락은 어떤 대비를 들려주었나요?",
      options: ["긴 멈춤과 짧은 질주", "처음부터 끝까지 같은 한 음", "계속 작아지기만 하는 소리"],
      answerIndex: 0,
      hint: "길게 머문 음 다음에 짧은 음들이 몰려온 순간을 떠올려 보세요.",
      badge: "대비 발견자",
    },
  }),
];

export function songDurationSeconds(song: Song): number {
  return (song.totalBeats * 60) / song.bpm;
}

export function sectionAt(song: Song, beat: number): SongSection {
  return song.sections.find((item) => beat >= item.startBeat && beat < item.endBeat) ?? song.sections.at(-1)!;
}
