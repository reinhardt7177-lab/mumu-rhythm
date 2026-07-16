import type { MelodyNote, Song, SongSection } from "../types";

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

export const songs: Song[] = [makeTwinkle(), makeOde(), makeWaltz()];

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
