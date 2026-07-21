import type { MelodyNote, Song, SongSection } from "../types";
import { fastCharts } from "./fastCharts.generated";

type PhraseNote = readonly [midi: number, durationBeats: number, accent?: boolean];

function phraseLength(phrase: readonly PhraseNote[]): number {
  return phrase.reduce((sum, note) => sum + note[1], 0);
}

function appendPhrase(
  target: MelodyNote[],
  phrase: readonly PhraseNote[],
  startBeat: number,
  phraseId: string,
  pitchRange: readonly [number, number],
): number {
  let beat = startBeat;
  phrase.forEach(([midi, durationBeats, accent], index) => {
    const normalized = (midi - pitchRange[0]) / Math.max(1, pitchRange[1] - pitchRange[0]);
    target.push({
      id: `${phraseId}-${index}`,
      beat,
      durationBeats,
      midi,
      lane: Math.max(0, Math.min(4, Math.round(normalized * 4))),
      phrase: phraseId,
      accent,
    });
    beat += durationBeats;
  });
  return beat;
}

function section(
  id: string,
  label: string,
  startBeat: number,
  endBeat: number,
  mode: SongSection["mode"] = "play",
): SongSection {
  return { id, label, startBeat, endBeat, mode };
}

const twinkleA: readonly PhraseNote[] = [
  [60, 1, true], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2, true],
  [65, 1, true], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2, true],
];
const twinkleB: readonly PhraseNote[] = [
  [67, 1, true], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2, true],
  [67, 1, true], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2, true],
];

function makeTwinkle(): Song {
  const melody: MelodyNote[] = [];
  let beat = 4;
  beat = appendPhrase(melody, twinkleA, beat, "A1", [60, 69]);
  beat = appendPhrase(melody, twinkleB, beat, "B", [60, 69]);
  beat = appendPhrase(melody, twinkleA, beat, "A2", [60, 69]);
  const listenStart = beat;
  beat += 8;
  beat = appendPhrase(melody, twinkleA, beat, "A-reprise", [60, 69]);

  return {
    id: "twinkle",
    collection: "foundation",
    title: "반짝반짝 작은 별",
    subtitle: "같은 가락이 돌아오는 순간을 찾아요",
    origin: "프랑스 전래 선율",
    grade: "3~4학년",
    difficulty: "처음",
    bpm: 88,
    beatsPerBar: 4,
    leadInBeats: 4,
    totalBeats: beat + 4,
    soundWorld: "starlight",
    artwork: "/assets/art/twinkle.webp",
    palette: {
      ink: "#102a32",
      deep: "#163d4b",
      accent: "#ffd866",
      warm: "#ff7a72",
      mist: "#d9f4ef",
    },
    mission: {
      eyebrow: "오늘의 귀 미션",
      title: "A 가락이 다시 올 때를 찾아요",
      description: "별이 올라갔다 내려오는 가락을 연주하고, 잠시 듣기만 하는 구간에서 같은 가락이 돌아오는지 들어 보세요.",
      question: "처음의 A 가락은 곡의 뒤쪽에서 어떻게 되었나요?",
      options: ["다시 나왔어요", "전혀 나오지 않았어요", "더 빠르게만 나왔어요"],
      answerIndex: 0,
      hint: "처음 두 마디의 낮은음과 높은음을 떠올려 보세요.",
      badge: "가락 탐정",
    },
    melody,
    sections: [
      section("intro", "별빛 준비", 0, 4, "listen"),
      section("a1", "A 가락", 4, 20),
      section("b", "B 가락", 20, 36),
      section("a2", "A 가락", 36, 52),
      section("listen", "귀를 열어요", listenStart, listenStart + 8, "listen"),
      section("reprise", "A 가락이 돌아왔어요", listenStart + 8, beat),
      section("outro", "별빛 끝맺음", beat, beat + 4, "listen"),
    ],
    harmony: [
      [48, 52, 55], [48, 53, 57], [48, 53, 57], [48, 52, 55],
      [47, 50, 55], [48, 53, 57], [48, 52, 55], [43, 47, 50],
    ],
  };
}

const odeA: readonly PhraseNote[] = [
  [64, 1, true], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
  [60, 1, true], [60, 1], [62, 1], [64, 1], [64, 1.5, true], [62, 0.5], [62, 2],
];
const odeA2: readonly PhraseNote[] = [
  [64, 1, true], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
  [60, 1, true], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, 0.5], [60, 2, true],
];
const odeB: readonly PhraseNote[] = [
  [62, 1, true], [62, 1], [64, 1], [60, 1], [62, 1], [64, 0.5], [65, 0.5], [64, 1], [60, 1],
  [62, 1], [64, 0.5], [65, 0.5], [64, 1], [62, 1], [60, 1], [62, 1], [55, 2, true],
];

function makeOde(): Song {
  const melody: MelodyNote[] = [];
  let beat = 4;
  beat = appendPhrase(melody, odeA, beat, "A1", [55, 67]);
  beat = appendPhrase(melody, odeA2, beat, "A2", [55, 67]);
  beat = appendPhrase(melody, odeB, beat, "B", [55, 67]);
  const listenStart = beat;
  beat += 8;
  beat = appendPhrase(melody, odeA2, beat, "A-return", [55, 67]);

  return {
    id: "ode",
    collection: "foundation",
    title: "환희의 노래",
    subtitle: "짧은 동기가 이어져 큰 가락을 만들어요",
    origin: "L. v. Beethoven 선율",
    grade: "3~4학년",
    difficulty: "차근차근",
    bpm: 102,
    beatsPerBar: 4,
    leadInBeats: 4,
    totalBeats: beat + 4,
    soundWorld: "sunrise",
    artwork: "/assets/art/ode.webp",
    palette: {
      ink: "#25302c",
      deep: "#355049",
      accent: "#ffb74f",
      warm: "#eb5f52",
      mist: "#e9f0d0",
    },
    mission: {
      eyebrow: "오늘의 귀 미션",
      title: "같은 시작 음형을 찾아요",
      description: "미-미-파-솔로 시작하는 짧은 음형이 여러 번 이어집니다. 같은 시작이 돌아올 때 손과 귀로 확인해 보세요.",
      question: "이 곡의 가락은 어떤 방법으로 길어졌나요?",
      options: ["짧은 음형을 반복하고 바꾸었어요", "한 음만 계속 냈어요", "리듬 없이 자유롭게 연주했어요"],
      answerIndex: 0,
      hint: "처음 네 음인 미-미-파-솔을 떠올려 보세요.",
      badge: "동기 발견자",
    },
    melody,
    sections: [
      section("intro", "아침을 열어요", 0, 4, "listen"),
      section("a1", "첫 번째 음형", 4, 20),
      section("a2", "조금 달라진 음형", 20, 36),
      section("b", "이어지는 가락", 36, listenStart),
      section("listen", "악기 소리를 들어요", listenStart, listenStart + 8, "listen"),
      section("return", "첫 음형이 돌아왔어요", listenStart + 8, beat),
      section("outro", "힘찬 끝맺음", beat, beat + 4, "listen"),
    ],
    harmony: [
      [48, 52, 55], [43, 47, 50], [45, 48, 52], [43, 47, 50],
      [48, 52, 55], [41, 45, 48], [43, 47, 50], [48, 52, 55],
    ],
  };
}

const waltzA: readonly PhraseNote[] = [
  [60, 1, true], [64, 1], [67, 1], [71, 2, true], [67, 1],
  [69, 1, true], [67, 1], [64, 1], [62, 2], [64, 1],
  [60, 1, true], [64, 1], [67, 1], [72, 2, true], [71, 1],
  [69, 1], [67, 1], [64, 1], [62, 2], [60, 1],
];
const waltzB: readonly PhraseNote[] = [
  [67, 1, true], [69, 1], [71, 1], [72, 2], [71, 1],
  [69, 1], [67, 1], [64, 1], [67, 2, true], [64, 1],
  [65, 1], [64, 1], [62, 1], [64, 2], [67, 1],
  [65, 1], [62, 1], [59, 1], [60, 3, true],
];

function makeWaltz(): Song {
  const melody: MelodyNote[] = [];
  let beat = 3;
  beat = appendPhrase(melody, waltzA, beat, "A1", [59, 72]);
  beat = appendPhrase(melody, waltzB, beat, "B", [59, 72]);
  const listenStart = beat;
  beat += 6;
  beat = appendPhrase(melody, waltzA, beat, "A-return", [59, 72]);

  return {
    id: "moon-waltz",
    collection: "foundation",
    title: "달빛 숲의 왈츠",
    subtitle: "하나-둘-셋, 흔들리는 3박을 느껴요",
    origin: "MUMU 창작곡",
    grade: "3~4학년",
    difficulty: "도전",
    bpm: 94,
    beatsPerBar: 3,
    leadInBeats: 3,
    totalBeats: beat + 3,
    soundWorld: "moonlight",
    artwork: "/assets/art/moon-waltz.webp",
    palette: {
      ink: "#192b38",
      deep: "#244753",
      accent: "#9fe6cf",
      warm: "#f2a2a8",
      mist: "#e5eef5",
    },
    mission: {
      eyebrow: "오늘의 귀 미션",
      title: "첫 박의 포근한 무게를 느껴요",
      description: "왈츠는 하나-둘-셋으로 흐릅니다. 첫 박은 조금 깊게, 둘과 셋은 가볍게 들리는지 확인해 보세요.",
      question: "왈츠 반주에서 가장 무게 있게 들린 박은 어느 박인가요?",
      options: ["첫째 박", "둘째 박", "셋째 박"],
      answerIndex: 0,
      hint: "낮은 베이스가 들어오는 순간을 세어 보세요. 하나-둘-셋!",
      badge: "3박 항해사",
    },
    melody,
    sections: [
      section("intro", "하나-둘-셋", 0, 3, "listen"),
      section("a1", "달빛 가락", 3, 27),
      section("b", "숲이 대답해요", 27, listenStart),
      section("listen", "첫 박을 찾아요", listenStart, listenStart + 6, "listen"),
      section("return", "달빛 가락이 돌아왔어요", listenStart + 6, beat),
      section("outro", "고요한 끝맺음", beat, beat + 3, "listen"),
    ],
    harmony: [
      [48, 52, 55], [47, 50, 55], [45, 48, 52], [43, 47, 50],
      [41, 45, 48], [43, 47, 50], [48, 52, 55], [48, 51, 55],
    ],
  };
}

function fastMelody(songId: string): MelodyNote[] {
  return fastCharts[songId].map((note, index) => ({
    id: `${songId}-${index}`,
    beat: note.beat,
    durationBeats: note.duration,
    midi: note.midi,
    lane: note.lane,
    phrase: `${songId}-${Math.floor(index / 16) + 1}`,
    accent: note.accent,
  }));
}

const speedSongs: Song[] = [
  {
    id: "turkish-march",
    collection: "speed",
    title: "터키 행진곡",
    subtitle: "짧은 피아노 음이 불꽃처럼 이어져요",
    origin: "W. A. Mozart · K.331 3악장",
    grade: "4~6학년",
    difficulty: "도전",
    bpm: 144,
    beatsPerBar: 2,
    leadInBeats: 4,
    totalBeats: 128,
    soundWorld: "turkish",
    approachSeconds: 2.55,
    backingTrack: "/assets/audio/backing/turkish-march.ogg",
    artwork: "/assets/art/turkish-march.webp",
    palette: { ink: "#2b1c25", deep: "#2d2335", accent: "#33d6cc", warm: "#ef4d5f", mist: "#fff0c9" },
    mission: {
      eyebrow: "스피드 클래식 01",
      title: "피아노 가락의 방향을 따라가요",
      description: "짧은 음이 계단처럼 오르고 내립니다. 높은음과 낮은음이 바뀌는 순간을 손의 위치로 느껴 보세요.",
      question: "터키 행진곡의 빠른 가락은 주로 어떻게 움직였나요?",
      options: ["계단처럼 오르내렸어요", "한 음만 길게 이어졌어요", "박 없이 자유롭게 흘렀어요"],
      answerIndex: 0,
      hint: "피아노 건반 위에서 가락이 어느 방향으로 달렸는지 떠올려 보세요.",
      badge: "피아노 질주자",
    },
    melody: fastMelody("turkish-march"),
    sections: [
      section("intro", "행진 준비", 0, 4, "listen"), section("a", "첫 번째 질주", 4, 28),
      section("b", "높아지는 가락", 28, 52), section("listen", "피아노만 들어요", 52, 60, "listen"),
      section("return", "가락이 돌아왔어요", 60, 92), section("finale", "마지막 질주", 92, 124),
      section("outro", "힘찬 끝맺음", 124, 128, "listen"),
    ],
    harmony: [[45, 52, 57], [40, 47, 52], [41, 48, 53], [40, 47, 52]],
  },
  {
    id: "can-can",
    collection: "speed",
    title: "캉캉",
    subtitle: "통통 튀는 같은 리듬을 찾아요",
    origin: "J. Offenbach · 천국과 지옥",
    grade: "4~6학년",
    difficulty: "도전",
    bpm: 176,
    beatsPerBar: 2,
    leadInBeats: 4,
    totalBeats: 152,
    soundWorld: "cancan",
    approachSeconds: 2.2,
    backingTrack: "/assets/audio/backing/can-can.ogg",
    artwork: "/assets/art/can-can.webp",
    palette: { ink: "#253428", deep: "#263a35", accent: "#ffd34f", warm: "#e84747", mist: "#e8f4d0" },
    mission: {
      eyebrow: "스피드 클래식 02",
      title: "반복되는 춤 리듬을 붙잡아요",
      description: "현악기가 같은 짧은 리듬을 되풀이하며 무대를 점점 더 신나게 만듭니다. 반복되는 박을 놓치지 마세요.",
      question: "캉캉을 신나게 만든 가장 큰 특징은 무엇인가요?",
      options: ["짧은 리듬의 빠른 반복", "아주 느린 한 음", "박자가 없는 연주"],
      answerIndex: 0,
      hint: "발걸음처럼 되풀이된 짧은 리듬을 떠올려 보세요.",
      badge: "리듬 점프왕",
    },
    melody: fastMelody("can-can"),
    sections: [
      section("intro", "무대가 열려요", 0, 4, "listen"), section("theme", "통통 튀는 주제", 4, 32),
      section("repeat", "리듬이 이어져요", 32, 60), section("listen", "반복을 들어요", 60, 68, "listen"),
      section("dance", "더 신나는 춤", 68, 108), section("finale", "축제의 피날레", 108, 148),
      section("outro", "무대 인사", 148, 152, "listen"),
    ],
    harmony: [[45, 49, 52], [40, 44, 47], [38, 42, 45], [40, 44, 47]],
  },
  {
    id: "william-tell",
    collection: "speed",
    title: "윌리엄 텔 서곡",
    subtitle: "금관과 팀파니의 질주를 느껴요",
    origin: "G. Rossini · 서곡 피날레",
    grade: "4~6학년",
    difficulty: "도전",
    bpm: 165,
    beatsPerBar: 2,
    leadInBeats: 4,
    totalBeats: 137,
    soundWorld: "gallop",
    approachSeconds: 2.3,
    backingTrack: "/assets/audio/backing/william-tell.ogg",
    artwork: "/assets/art/william-tell.webp",
    palette: { ink: "#162d38", deep: "#1d4050", accent: "#ffda4c", warm: "#f05b47", mist: "#dff5e7" },
    mission: {
      eyebrow: "스피드 클래식 03",
      title: "달리는 리듬의 강박을 찾아요",
      description: "트럼펫이 힘찬 가락을 부르고 팀파니가 첫 박을 밀어 줍니다. 마디의 시작이 더 무겁게 들리는지 확인하세요.",
      question: "질주하는 느낌을 가장 힘차게 만든 소리는 무엇이었나요?",
      options: ["금관과 팀파니의 강한 첫 박", "작은 종 한 음", "소리가 없는 쉼만"],
      answerIndex: 0,
      hint: "마디가 시작될 때 둥 하고 받쳐 준 소리를 떠올려 보세요.",
      badge: "알프스 지휘자",
    },
    melody: fastMelody("william-tell"),
    sections: [
      section("intro", "출발 신호", 0, 4, "listen"), section("gallop", "질주하는 주제", 4, 32),
      section("answer", "오케스트라의 대답", 32, 56), section("listen", "첫 박을 들어요", 56, 64, "listen"),
      section("return", "주제가 돌아왔어요", 64, 100), section("finale", "산을 넘는 피날레", 100, 133),
      section("outro", "도착!", 133, 137, "listen"),
    ],
    harmony: [[38, 45, 50], [43, 47, 50], [45, 49, 52], [38, 45, 50]],
  },
  {
    id: "hungarian-dance",
    collection: "speed",
    title: "헝가리 무곡 5번",
    subtitle: "멈춤과 질주의 강렬한 대비를 들어요",
    origin: "J. Brahms · 헝가리 무곡 5번",
    grade: "4~6학년",
    difficulty: "도전",
    bpm: 148,
    beatsPerBar: 2,
    leadInBeats: 4,
    totalBeats: 136,
    soundWorld: "hungarian",
    approachSeconds: 2.45,
    backingTrack: "/assets/audio/backing/hungarian-dance.ogg",
    artwork: "/assets/art/hungarian-dance.webp",
    palette: { ink: "#2e1b2a", deep: "#39283b", accent: "#55d1c6", warm: "#df4c62", mist: "#f7e2c5" },
    mission: {
      eyebrow: "스피드 클래식 04",
      title: "길게 머물고 빠르게 달리는 순간을 찾아요",
      description: "바이올린 가락이 길게 숨을 고른 뒤 갑자기 빠르게 달립니다. 음의 길이가 바뀌는 대비에 집중하세요.",
      question: "헝가리 무곡의 가락은 어떤 대비를 들려주었나요?",
      options: ["느긋한 멈춤과 빠른 질주", "처음부터 끝까지 같은 한 음", "계속 작아지기만 하는 소리"],
      answerIndex: 0,
      hint: "길게 머문 음 다음에 짧은 음들이 몰려온 순간을 떠올려 보세요.",
      badge: "대비 발견자",
    },
    melody: fastMelody("hungarian-dance"),
    sections: [
      section("intro", "바이올린 준비", 0, 4, "listen"), section("slow", "숨을 고르는 가락", 4, 28),
      section("rush", "갑자기 빨라져요", 28, 52), section("listen", "대비를 들어요", 52, 60, "listen"),
      section("dance", "다시 춤춰요", 60, 96), section("finale", "불꽃 피날레", 96, 132),
      section("outro", "우아한 끝맺음", 132, 136, "listen"),
    ],
    harmony: [[43, 46, 50], [38, 43, 47], [36, 39, 43], [38, 42, 45]],
  },
];

export const songs: Song[] = [makeTwinkle(), makeOde(), makeWaltz(), ...speedSongs];

export function songDurationSeconds(song: Song): number {
  return (song.totalBeats * 60) / song.bpm;
}

export function sectionAt(song: Song, beat: number): SongSection {
  return song.sections.find((item) => beat >= item.startBeat && beat < item.endBeat) ?? song.sections.at(-1)!;
}

export function countBars(song: Song): number {
  return Math.ceil(song.totalBeats / song.beatsPerBar);
}

export function phraseBeats(phrase: readonly PhraseNote[]): number {
  return phraseLength(phrase);
}
