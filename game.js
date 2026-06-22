// MUMU 리듬 피아노 — Canvas 2D 픽셀 네온 아케이드 렌더러
// (Three.js 3D 폐기. 오디오 엔진 / 판정 / 음높이→레인 채보 / DOM HUD 는 그대로 유지)

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const comboMeterEl = document.querySelector("#comboMeter");
const syncEl = document.querySelector("#sync");
const bestEl = document.querySelector("#best");
const progressEl = document.querySelector("#progress");
const timeEl = document.querySelector("#time");
const hudTrackName = document.querySelector("#hudTrackName");
const hudBpm = document.querySelector("#hudBpm");
const hudDifficulty = document.querySelector("#hudDifficulty");
const startOverlay = document.querySelector("#startOverlay");
const startButton = document.querySelector("#startButton");
const quickStartButton = document.querySelector("#quickStartButton");
const audioStatus = document.querySelector("#audioStatus");
const toast = document.querySelector("#toast");
const keyButtons = [...document.querySelectorAll(".keybar button")];
const judgeEls = [0, 1, 2, 3, 4].map((lane) => document.querySelector(`#judge${lane}`));
const selectedSongTitle = document.querySelector("#selectedSongTitle");
const selectedSongComposer = document.querySelector("#selectedSongComposer");
const selectedSongMeta = document.querySelector("#selectedSongMeta");
const songIndexEl = document.querySelector("#songIndex");
const songCountEl = document.querySelector("#songCount");
const carouselPrev = document.querySelector(".carousel-nav.prev");
const carouselNext = document.querySelector(".carousel-nav.next");

const laneKeys = new Map([
  ["KeyA", 0],
  ["KeyS", 1],
  ["KeyD", 2],
  ["KeyF", 3],
  ["KeyG", 4],
]);

const LANES = 5;
const LANE_COLORS = ["#36e6ff", "#9b6bff", "#ff5fd0", "#ffb04d", "#7cff6b"];
const LANE_CENTER = (LANES - 1) / 2;
let approachTime = 2.4; // 노트가 스폰→판정선까지 걸리는 시간(난이도별로 변경)
let bpm = 96;
let songLength = 36;
const perfectWindow = 0.045;
const greatWindow = 0.085;
const goodWindow = 0.135;
const missWindow = 0.18;

let audioContext;
let masterGain;
let musicBus;
let compressor;
const trackBuffers = new Map();
let trackSource = null;
let startAudioTime = 0;
let startVisualTime = 0;
let started = false;
let gameOver = false;
let score = 0;
let bestScore = 0;
let combo = 0;
let maxCombo = 0;
let health = 100;
let lastToastTimer = 0;
let pulse = 0;
let trauma = 0; // 스크린셰이크 강도(감쇠)
let chart = [];
let notes = [];
let lanePitches = ["C4", "E4", "G4", "C5", "E5"]; // 레인별 폴백 음(곡 로드 시 갱신)
let particles = [];
const receptorPop = new Array(LANES).fill(0);
let poseName = "idol";
let poseTimer = 0;
const urlParams = new URLSearchParams(window.location.search);
let visualDemo = urlParams.has("demo");
let fixedDemoTime = Number(urlParams.get("demoTime"));
let lastFrameTime = performance.now();
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 음이름(예: "C#5","Eb3","A4") → MIDI / 주파수. "rest"는 무음 간격.
const NOTE_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(name) {
  const m = /^([A-Ga-g])([#b]*)(-?\d+)$/.exec(String(name).trim());
  if (!m) return null;
  let semi = NOTE_SEMITONES[m[1].toUpperCase()];
  for (const acc of m[2]) semi += acc === "#" ? 1 : -1;
  return semi + (Number(m[3]) + 1) * 12; // C4 = 60, A4 = 69
}
const freqCache = new Map();
function noteToFreq(name) {
  if (name == null || name === "rest") return null;
  if (freqCache.has(name)) return freqCache.get(name);
  const midi = noteToMidi(name);
  const freq = midi == null ? null : 440 * Math.pow(2, (midi - 69) / 12);
  freqCache.set(name, freq);
  return freq;
}

// 클래식 피아노 독주 10곡. melody = {n: 음이름|"rest", b: 박자}
// 6곡(엘리제·월광·터키행진곡·짐노페디·녹턴·클레르 드 륀)은 퍼블릭 도메인 MIDI에서
// 멜로디 라인 추출 후 정리(tools/midi_to_melody.mjs), 4곡은 악보 기반 직접 작성.
const songs = [
  {
    id: "fur-elise", title: "Für Elise", composer: "L. v. Beethoven",
    difficulty: "NORMAL", bpm: 100, stage: "city", lesson: "반음 트릴과 아르페지오",
    melody: [
      {n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},{n:"B4",b:0.5},{n:"D5",b:0.5},{n:"C5",b:0.5},
      {n:"A4",b:1},{n:"rest",b:0.5},{n:"C4",b:0.5},{n:"E4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:1},{n:"rest",b:0.5},{n:"E4",b:0.5},
      {n:"G#4",b:0.5},{n:"B4",b:0.5},{n:"C5",b:1},{n:"rest",b:0.5},{n:"E4",b:0.5},{n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},
      {n:"D#5",b:0.5},{n:"E5",b:0.5},{n:"B4",b:0.5},{n:"D5",b:0.5},{n:"C5",b:0.5},{n:"A4",b:1},{n:"rest",b:0.5},{n:"C4",b:0.5},
      {n:"E4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:1},{n:"rest",b:0.5},{n:"E4",b:0.5},{n:"C5",b:0.5},{n:"B4",b:0.5},{n:"A4",b:1},
      {n:"rest",b:1},{n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},{n:"B4",b:0.5},{n:"D5",b:0.5},
      {n:"C5",b:0.5},{n:"A4",b:1},{n:"rest",b:0.5},{n:"C4",b:0.5},{n:"E4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:1},{n:"rest",b:0.5},
      {n:"E4",b:0.5},{n:"G#4",b:0.5},{n:"B4",b:0.5},{n:"C5",b:1},{n:"rest",b:0.5},{n:"E4",b:0.5},{n:"E5",b:0.5},{n:"D#5",b:0.5},
      {n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},{n:"B4",b:0.5},{n:"D5",b:0.5},{n:"C5",b:0.5},{n:"A4",b:1},{n:"rest",b:0.5},
      {n:"C4",b:0.5},{n:"E4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:1},{n:"rest",b:0.5},{n:"E4",b:0.5},{n:"C5",b:0.5},{n:"B4",b:0.5},
      {n:"A4",b:2},
    ],
  },
  {
    id: "ode-to-joy", title: "환희의 송가", composer: "L. v. Beethoven",
    difficulty: "EASY", bpm: 100, stage: "arena", lesson: "순차진행 4박 감각",
    melody: [
      {n:"E4",b:1},{n:"E4",b:1},{n:"F4",b:1},{n:"G4",b:1},{n:"G4",b:1},{n:"F4",b:1},{n:"E4",b:1},{n:"D4",b:1},
      {n:"C4",b:1},{n:"C4",b:1},{n:"D4",b:1},{n:"E4",b:1},{n:"E4",b:1.5},{n:"D4",b:0.5},{n:"D4",b:2},
      {n:"E4",b:1},{n:"E4",b:1},{n:"F4",b:1},{n:"G4",b:1},{n:"G4",b:1},{n:"F4",b:1},{n:"E4",b:1},{n:"D4",b:1},
      {n:"C4",b:1},{n:"C4",b:1},{n:"D4",b:1},{n:"E4",b:1},{n:"D4",b:1.5},{n:"C4",b:0.5},{n:"C4",b:2},
      {n:"D4",b:1},{n:"D4",b:1},{n:"E4",b:1},{n:"C4",b:1},{n:"D4",b:1},{n:"E4",b:0.5},{n:"F4",b:0.5},{n:"E4",b:1},{n:"C4",b:1},
      {n:"D4",b:1},{n:"E4",b:0.5},{n:"F4",b:0.5},{n:"E4",b:1},{n:"D4",b:1},{n:"C4",b:1},{n:"D4",b:1},{n:"G3",b:2},
      {n:"E4",b:1},{n:"E4",b:1},{n:"F4",b:1},{n:"G4",b:1},{n:"G4",b:1},{n:"F4",b:1},{n:"E4",b:1},{n:"D4",b:1},
      {n:"C4",b:1},{n:"C4",b:1},{n:"D4",b:1},{n:"E4",b:1},{n:"D4",b:1.5},{n:"C4",b:0.5},{n:"C4",b:2},
    ],
  },
  {
    id: "moonlight", title: "Moonlight Sonata", composer: "L. v. Beethoven",
    difficulty: "HARD", bpm: 52, stage: "galaxy", lesson: "셋잇단 아르페지오",
    melody: [
      {n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},
      {n:"E4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"G#3",b:0.25},
      {n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},
      {n:"A3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"A3",b:0.25},{n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"A3",b:0.25},{n:"D4",b:0.25},
      {n:"F#4",b:0.25},{n:"A3",b:0.25},{n:"D4",b:0.25},{n:"F#4",b:0.25},{n:"G#3",b:0.25},{n:"C4",b:0.25},{n:"F#4",b:0.25},{n:"G#3",b:0.25},
      {n:"C#4",b:0.25},{n:"E4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"D#4",b:0.25},{n:"F#3",b:0.5},{n:"C4",b:0.5},{n:"D#4",b:0.5},
      {n:"E3",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},{n:"G#3",b:0.25},{n:"C#4",b:0.25},
    ],
  },
  {
    id: "turkish-march", title: "Rondo Alla Turca", composer: "W. A. Mozart",
    difficulty: "HARD", bpm: 96, stage: "arena", lesson: "빠른 16분 런과 도약",
    melody: [
      {n:"B4",b:0.5},{n:"A4",b:0.5},{n:"G#4",b:0.5},{n:"A4",b:0.5},{n:"C5",b:1},{n:"rest",b:0.5},{n:"D5",b:0.5},{n:"C5",b:0.5},
      {n:"B4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:1},{n:"rest",b:0.5},{n:"F5",b:0.5},{n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},
      {n:"B5",b:0.5},{n:"A5",b:0.5},{n:"G#5",b:0.5},{n:"A5",b:0.5},{n:"B5",b:0.5},{n:"A5",b:0.5},{n:"G#5",b:0.5},{n:"A5",b:0.5},
      {n:"C6",b:1},{n:"rest",b:0.5},
      {n:"B4",b:0.5},{n:"A4",b:0.5},{n:"G#4",b:0.5},{n:"A4",b:0.5},{n:"C5",b:1},{n:"rest",b:0.5},{n:"D5",b:0.5},{n:"C5",b:0.5},
      {n:"B4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:1},{n:"rest",b:0.5},{n:"F5",b:0.5},{n:"E5",b:0.5},{n:"D#5",b:0.5},{n:"E5",b:0.5},
      {n:"B5",b:0.5},{n:"A5",b:0.5},{n:"G#5",b:0.5},{n:"A5",b:0.5},{n:"C6",b:0.5},{n:"B5",b:0.5},{n:"A5",b:0.5},{n:"G#5",b:0.5},
      {n:"A5",b:2},
    ],
  },
  {
    id: "clair-de-lune", title: "Clair de Lune", composer: "C. Debussy",
    difficulty: "NORMAL", bpm: 60, stage: "sunset", lesson: "인상주의 화성과 호흡",
    melody: [
      {n:"G#4",b:0.5},{n:"G#5",b:1.5},{n:"F5",b:1.25},{n:"A4",b:0.5},{n:"D#5",b:0.25},{n:"F5",b:0.25},{n:"D#5",b:1.75},{n:"G#4",b:0.25},
      {n:"C#5",b:0.25},{n:"D#5",b:0.25},{n:"C#5",b:0.5},{n:"F5",b:1},{n:"C#5",b:0.5},{n:"F#4",b:0.25},{n:"C5",b:0.25},{n:"C#5",b:0.25},
      {n:"C5",b:1.75},{n:"F#4",b:0.25},{n:"A#4",b:0.25},{n:"C5",b:0.25},{n:"A#4",b:0.25},{n:"D#5",b:0.25},{n:"A#4",b:0.25},{n:"G#4",b:0.25},
      {n:"A#4",b:0.25},{n:"G#4",b:0.25},{n:"D#4",b:0.25},{n:"F#4",b:0.25},{n:"G#4",b:0.25},{n:"F#4",b:1},{n:"F4",b:1.25},{n:"C#4",b:0.25},
      {n:"F4",b:0.25},{n:"F#4",b:0.25},{n:"F4",b:0.25},{n:"A#4",b:0.25},{n:"F4",b:0.25},{n:"D#4",b:0.25},{n:"F4",b:0.25},{n:"D#4",b:0.5},
      {n:"C#4",b:0.25},{n:"D#4",b:0.25},{n:"C#4",b:1},{n:"C4",b:1.5},
    ],
  },
  {
    id: "nocturne", title: "Nocturne Op.9 No.2", composer: "F. Chopin",
    difficulty: "NORMAL", bpm: 92, stage: "galaxy", lesson: "장식음과 긴 호흡의 칸타빌레",
    melody: [
      {n:"A#4",b:1.5},{n:"G5",b:3},{n:"F5",b:1},{n:"G5",b:1.25},{n:"F5",b:2.75},{n:"D#5",b:1.5},{n:"rest",b:0.25},{n:"A#4",b:1.25},
      {n:"G5",b:1.75},{n:"C5",b:0.25},{n:"C#5",b:0.25},{n:"B4",b:0.25},{n:"C5",b:0.75},{n:"C6",b:1.75},{n:"G5",b:1},{n:"A#5",b:2.5},
      {n:"G#5",b:1.75},{n:"G5",b:1},{n:"F5",b:2.5},{n:"rest",b:0.25},{n:"G5",b:1.75},
    ],
  },
  {
    id: "gymnopedie", title: "Gymnopédie No.1", composer: "E. Satie",
    difficulty: "EASY", bpm: 76, stage: "sunset", lesson: "느린 3박 서정",
    melody: [
      {n:"F#4",b:2},{n:"rest",b:1},{n:"F#4",b:2},{n:"rest",b:1},{n:"F#4",b:2},{n:"rest",b:1},{n:"F#4",b:2},{n:"rest",b:1},
      {n:"F#5",b:1},{n:"A5",b:1},{n:"G5",b:1},{n:"F#5",b:1},{n:"C#5",b:1},{n:"B4",b:1},{n:"C#5",b:1},{n:"D5",b:1},
      {n:"A4",b:1},{n:"F#4",b:2},{n:"rest",b:1},
      {n:"F#5",b:1},{n:"A5",b:1},{n:"G5",b:1},{n:"F#5",b:1},{n:"C#5",b:1},{n:"B4",b:1},{n:"C#5",b:1},{n:"D5",b:1},
      {n:"A4",b:1},{n:"F#4",b:3},
    ],
  },
  {
    id: "minuet-g", title: "Minuet in G", composer: "C. Petzold",
    difficulty: "EASY", bpm: 120, stage: "school", lesson: "우아한 3박 미뉴에트",
    melody: [
      {n:"D5",b:1},{n:"G4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:0.5},{n:"C5",b:0.5},{n:"D5",b:1},{n:"G4",b:1},{n:"G4",b:1},
      {n:"E5",b:1},{n:"C5",b:0.5},{n:"D5",b:0.5},{n:"E5",b:0.5},{n:"F#5",b:0.5},{n:"G5",b:1},{n:"G4",b:1},{n:"G4",b:1},
      {n:"C5",b:1},{n:"D5",b:0.5},{n:"C5",b:0.5},{n:"B4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:1},{n:"C5",b:0.5},{n:"B4",b:0.5},{n:"A4",b:0.5},{n:"G4",b:0.5},
      {n:"A4",b:1},{n:"B4",b:0.5},{n:"A4",b:0.5},{n:"G4",b:0.5},{n:"F#4",b:0.5},{n:"G4",b:3},
      {n:"D5",b:1},{n:"G4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:0.5},{n:"C5",b:0.5},{n:"D5",b:1},{n:"G4",b:1},{n:"G4",b:1},
      {n:"E5",b:1},{n:"C5",b:0.5},{n:"D5",b:0.5},{n:"E5",b:0.5},{n:"F#5",b:0.5},{n:"G5",b:1},{n:"G4",b:1},{n:"G4",b:1},
    ],
  },
  {
    id: "canon-d", title: "Canon in D", composer: "J. Pachelbel",
    difficulty: "EASY", bpm: 96, stage: "galaxy", lesson: "하행 시퀀스와 화성",
    melody: [
      {n:"F#5",b:2},{n:"E5",b:2},{n:"D5",b:2},{n:"C#5",b:2},{n:"B4",b:2},{n:"A4",b:2},{n:"B4",b:2},{n:"C#5",b:2},
      {n:"D5",b:1},{n:"C#5",b:1},{n:"B4",b:1},{n:"A4",b:1},{n:"G4",b:1},{n:"F#4",b:1},{n:"G4",b:1},{n:"A4",b:1},
      {n:"F#5",b:1},{n:"E5",b:1},{n:"D5",b:1},{n:"C#5",b:1},{n:"B4",b:1},{n:"A4",b:1},{n:"B4",b:1},{n:"C#5",b:1},
      {n:"D5",b:0.5},{n:"E5",b:0.5},{n:"F#5",b:0.5},{n:"G5",b:0.5},{n:"A5",b:0.5},{n:"G5",b:0.5},{n:"F#5",b:0.5},{n:"E5",b:0.5},
      {n:"D5",b:0.5},{n:"C#5",b:0.5},{n:"B4",b:0.5},{n:"A4",b:0.5},{n:"B4",b:0.5},{n:"C#5",b:0.5},{n:"D5",b:0.5},{n:"E5",b:0.5},
      {n:"F#5",b:2},
    ],
  },
  {
    id: "prelude-c", title: "Prelude in C", composer: "J. S. Bach",
    difficulty: "NORMAL", bpm: 84, stage: "city", lesson: "분산화음(아르페지오) 연습",
    melody: [
      {n:"C4",b:0.5},{n:"E4",b:0.5},{n:"G4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:0.5},{n:"G4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:0.5},
      {n:"C4",b:0.5},{n:"D4",b:0.5},{n:"A4",b:0.5},{n:"D5",b:0.5},{n:"F5",b:0.5},{n:"A4",b:0.5},{n:"D5",b:0.5},{n:"F5",b:0.5},
      {n:"B3",b:0.5},{n:"D4",b:0.5},{n:"G4",b:0.5},{n:"D5",b:0.5},{n:"F5",b:0.5},{n:"G4",b:0.5},{n:"D5",b:0.5},{n:"F5",b:0.5},
      {n:"C4",b:0.5},{n:"E4",b:0.5},{n:"G4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:0.5},{n:"G4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:0.5},
      {n:"C4",b:0.5},{n:"E4",b:0.5},{n:"A4",b:0.5},{n:"E5",b:0.5},{n:"A5",b:0.5},{n:"A4",b:0.5},{n:"E5",b:0.5},{n:"A5",b:0.5},
      {n:"C4",b:0.5},{n:"D4",b:0.5},{n:"F#4",b:0.5},{n:"A4",b:0.5},{n:"D5",b:0.5},{n:"F#4",b:0.5},{n:"A4",b:0.5},{n:"D5",b:0.5},
      {n:"B3",b:0.5},{n:"D4",b:0.5},{n:"G4",b:0.5},{n:"D5",b:0.5},{n:"G5",b:0.5},{n:"G4",b:0.5},{n:"D5",b:0.5},{n:"G5",b:0.5},
      {n:"C4",b:0.5},{n:"E4",b:0.5},{n:"G4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:0.5},{n:"G4",b:0.5},{n:"C5",b:0.5},{n:"E5",b:0.5},
    ],
  },
];

let selectedSongIndex = 0;
let selectedSong = songs[selectedSongIndex];

// ===== 채보 생성 (멜로디 → 5레인 매핑. 소리는 히트한 노트에서만 난다) =====
// 난이도 → 스크롤 속도(approach) / 긴 음 동시치기 여부
function classicalProfile(difficulty) {
  switch (difficulty) {
    case "HARD":
      return { approach: 1.95, doubleAccent: true };
    case "NORMAL":
      return { approach: 2.3, doubleAccent: false };
    default: // EASY
      return { approach: 2.75, doubleAccent: false };
  }
}

// 멜로디({n,b}) → 5레인 채보. rest는 시간만 진행시키고 노트는 만들지 않는다.
// 음높이가 낮을수록 왼쪽(레인 0), 높을수록 오른쪽(레인 4)에 배치 → 손가락이 곡선을 따라간다.
function buildChart() {
  const beat = 60 / bpm;
  const mel = selectedSong.melody || [];
  const profile = classicalProfile(selectedSong.difficulty);
  approachTime = profile.approach;

  const midis = mel.filter((e) => e.n !== "rest").map((e) => noteToMidi(e.n));
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  // 2옥타브를 넘는 광음역은 옥타브 폴딩으로 접어 contour(레인 분포)를 보존
  const fold = (m) => {
    while (m - lo > 24) m -= 12;
    while (hi - m > 24) m += 12;
    return m;
  };
  const folded = midis.map(fold);
  const foldedLo = Math.min(...folded);
  const span = Math.max(1, Math.max(...folded) - foldedLo);

  const notesOut = [];
  const pushNote = (lane, pitch, t) => {
    notesOut.push({ time: Number(t.toFixed(4)), lane, pitch, hit: false, missed: false });
  };

  // 멜로디를 ~60초가 될 때까지 반복 재생(루프 사이 2박 숨고르기), 목표 도달 시 중단.
  const TARGET_SEC = 58;
  const leadIn = 2;
  const gapBeats = 2;
  let time = leadIn;
  let prevLane = -1;
  let pass = 0;
  outer: while (pass < 20) {
    if (pass > 0) time += gapBeats * beat;
    for (const e of mel) {
      if (time - leadIn >= TARGET_SEC) break outer;
      if (e.n === "rest") {
        time += e.b * beat;
        continue;
      }
      const midi = fold(noteToMidi(e.n));
      let lane = Math.round(((midi - foldedLo) / span) * (LANES - 1));
      if (lane === prevLane) lane = lane >= LANES - 1 ? lane - 1 : lane + 1;
      prevLane = lane;

      pushNote(lane, e.n, time);
      if (profile.doubleAccent && e.b >= 1.5) {
        pushNote((lane + 2) % LANES, e.n, time);
      }

      time += e.b * beat;
    }
    pass += 1;
  }

  songLength = Math.ceil(time + 2);

  // 레인별 대표 음(중앙값) — 노트가 없는 타이밍에 눌러도 그 곡 조성에 맞는 음이 나도록
  const perLane = Array.from({ length: LANES }, () => []);
  notesOut.forEach((n) => perLane[n.lane].push(n.pitch));
  lanePitches = perLane.map((arr) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => noteToMidi(a) - noteToMidi(b));
    return sorted[Math.floor(sorted.length / 2)];
  });
  for (let i = 0; i < LANES; i += 1) {
    if (!lanePitches[i]) lanePitches[i] = lanePitches.find((p) => p) || "C4";
  }

  return notesOut;
}

// ===== 에셋 로딩 + 레인 색 틴팅 =====
const IMG = {};
const ASSETS = {
  bgcity: "bg-city.png",
  bgarena: "bg-arena.png",
  bgschool: "bg-school.png",
  bgsunset: "bg-sunset.png",
  bggalaxy: "bg-galaxy.png",
  crowd: "bg-crowd.png",
  fever: "fever-aura.png",
  idol: "mascot-idol.png",
  idolSing: "mascot-sing.png",
  idolCheer: "mascot-cheer.png",
  idolMiss: "mascot-miss.png",
  gem: "note-gem.png",
  star: "star-note.png",
  receptor: "receptor.png",
  burst: "hit-burst.png",
  ring: "ring.png",
};
let assetsReady = false;
const tintCache = {};

function tint(img, color) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(img, 0, 0);
  return c;
}

function buildTints() {
  ["gem", "burst", "ring", "receptor", "star"].forEach((kind) => {
    const img = IMG[kind];
    if (!img || !img.width) return;
    LANE_COLORS.forEach((col, i) => {
      tintCache[kind + i] = tint(img, col);
    });
  });
}

function loadAssets() {
  const keys = Object.keys(ASSETS);
  let n = 0;
  const done = () => {
    if (++n >= keys.length) {
      assetsReady = true;
      buildTints();
    }
  };
  keys.forEach((k) => {
    const im = new Image();
    im.onload = done;
    im.onerror = done;
    im.src = `./assets/pixel/${ASSETS[k]}?v=1`;
    IMG[k] = im;
  });
}

function stageImg() {
  return IMG["bg" + (selectedSong.stage || "city")] || IMG.bgcity;
}

// ===== 2D 하이웨이 지오메트리 (유사 원근) =====
let W = 0;
let H = 0;
let DPR = 1;

function topY() {
  return H * 0.3;
}
function judgeY() {
  return H * 0.8;
}
function spread(p) {
  // 하이웨이 전체 폭(상단 좁고 하단 넓음)을 레인 수로 나눈 레인 간격
  return lerp(W * 0.2, W * 0.5, p) / (LANES - 1);
}
function laneCenterX(lane, p) {
  return W * 0.5 + (lane - LANE_CENTER) * spread(p);
}
function noteY(p) {
  return lerp(topY(), judgeY(), Math.pow(clamp(p, 0, 1), 1.5));
}
function laneScale(p) {
  return lerp(0.42, 1.18, clamp(p, 0, 1));
}
function noteBase() {
  // 좁은 화면(8레인)에서 노트가 겹치지 않도록 레인 폭에도 맞춤
  return Math.min(H * 0.072, spread(1) * 1.05);
}

// ===== 오디오: 실제 그랜드 피아노 샘플 + 알고리즘 리버브 =====
// 음역(G3~E6)을 단3도 간격으로 커버하는 Salamander Grand Piano 샘플(퍼블릭/CC-BY).
// 누른 음과 가장 가까운 샘플을 골라 playbackRate로 미세 피치시프트(±1.5반음) → 진짜 피아노 음색.
const SAMPLE_NOTES = {
  45: "A2", 48: "C3", 51: "Ds3", 54: "Fs3", 57: "A3", 60: "C4", 63: "Ds4", 66: "Fs4",
  69: "A4", 72: "C5", 75: "Ds5", 78: "Fs5", 81: "A5", 84: "C6", 87: "Ds6", 90: "Fs6",
};
const sampleBuffers = new Map(); // midi -> AudioBuffer
const sampleMidis = [];
let samplesReady = false;
let samplesLoading = false;
let reverbSend = null;

function setupAudio() {
  if (audioContext) return;
  audioContext = new AudioContext({ latencyHint: "interactive" });
  masterGain = audioContext.createGain();
  compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.2;
  masterGain.gain.value = 1.0;
  masterGain.connect(compressor);
  compressor.connect(audioContext.destination);

  musicBus = audioContext.createGain();
  musicBus.gain.value = 0.8;
  musicBus.connect(masterGain);

  setupReverb();
  loadPianoSamples();
}

// 합성 임펄스 응답 기반 홀 리버브 (지수 감쇠 노이즈)
function setupReverb() {
  const conv = audioContext.createConvolver();
  const len = Math.floor(audioContext.sampleRate * 2.4);
  const ir = audioContext.createBuffer(2, len, audioContext.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i += 1) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
  }
  conv.buffer = ir;
  reverbSend = audioContext.createGain();
  reverbSend.gain.value = 1.0;
  const wet = audioContext.createGain();
  wet.gain.value = 0.28;
  reverbSend.connect(conv);
  conv.connect(wet);
  wet.connect(masterGain);
}

async function loadPianoSamples() {
  if (samplesLoading || samplesReady || !audioContext) return;
  samplesLoading = true;
  await Promise.all(
    Object.entries(SAMPLE_NOTES).map(async ([midi, name]) => {
      try {
        const res = await fetch(`./assets/piano/${name}.mp3`);
        const buf = await audioContext.decodeAudioData(await res.arrayBuffer());
        sampleBuffers.set(Number(midi), buf);
      } catch {
        /* 샘플 로드 실패 시 해당 음은 합성음으로 폴백 */
      }
    }),
  );
  sampleMidis.length = 0;
  sampleMidis.push(...[...sampleBuffers.keys()].sort((a, b) => a - b));
  samplesReady = sampleBuffers.size > 0;
  samplesLoading = false;
}

function nearestSampleMidi(midi) {
  let best = sampleMidis[0];
  let bd = Infinity;
  for (const m of sampleMidis) {
    const d = Math.abs(m - midi);
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

function playSampledPiano(midi, when, velocity, destination) {
  const sm = nearestSampleMidi(midi);
  const buf = sampleBuffers.get(sm);
  if (!buf) return false;
  const src = audioContext.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = Math.pow(2, (midi - sm) / 12);
  const g = audioContext.createGain();
  const v = Math.max(0.12, Math.min(1, velocity)) * 0.85;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(v, when + 0.006);
  src.connect(g);
  g.connect(destination);
  if (reverbSend) g.connect(reverbSend);
  src.start(when);
  src.stop(when + 7);
  return true;
}

async function ensureTrackLoaded(url) {
  if (trackBuffers.has(url)) return trackBuffers.get(url);
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  const buffer = await audioContext.decodeAudioData(arr);
  trackBuffers.set(url, buffer);
  return buffer;
}

function stopTrack() {
  if (!trackSource) return;
  try {
    trackSource.stop();
  } catch {
    /* 이미 멈춤 */
  }
  trackSource = null;
}

function playStartCue(when = audioContext.currentTime) {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, when + index * 0.045);
    gain.gain.setValueAtTime(0.0001, when + index * 0.045);
    gain.gain.exponentialRampToValueAtTime(0.12, when + index * 0.045 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + index * 0.045 + 0.18);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(when + index * 0.045);
    osc.stop(when + index * 0.045 + 0.2);
  });
}

function playPiano(pitch, when = audioContext.currentTime, velocity = 1, destination = masterGain) {
  const midi = noteToMidi(pitch);
  if (midi == null) return;
  // 샘플이 준비됐으면 진짜 피아노 음, 아니면 합성음으로 폴백
  if (samplesReady && playSampledPiano(midi, when, velocity, destination)) return;
  const freq = noteToFreq(pitch);
  if (!freq) return;
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.3 * velocity, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.08 * velocity, when + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.78);

  [1, 2.01, 3.01].forEach((multiple, index) => {
    const osc = audioContext.createOscillator();
    osc.type = index === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq * multiple, when);
    osc.detune.setValueAtTime(index * 3, when);
    osc.connect(filter);
    osc.start(when);
    osc.stop(when + 0.82);
  });

  filter.connect(gain);
  gain.connect(destination);
  if (reverbSend) gain.connect(reverbSend);

  if (velocity > 0.8 && freq < 1200) {
    const bellGain = audioContext.createGain();
    const bell = audioContext.createOscillator();
    bell.type = "sine";
    bell.frequency.setValueAtTime(freq * 4, when);
    bellGain.gain.setValueAtTime(0.0001, when);
    bellGain.gain.exponentialRampToValueAtTime(0.035, when + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
    bell.connect(bellGain);
    bellGain.connect(masterGain);
    bell.start(when);
    bell.stop(when + 0.52);
  }
}

function playClick(when = audioContext.currentTime) {
  const noise = audioContext.createBufferSource();
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(3000, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.12, when + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(when);
  noise.stop(when + 0.06);
}

function playKick(when = audioContext.currentTime, destination = masterGain) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.16);
  gain.gain.setValueAtTime(0.38, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + 0.21);
}

function playSnare(when = audioContext.currentTime, destination = masterGain) {
  const noise = audioContext.createBufferSource();
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.16, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800, when);
  filter.Q.setValueAtTime(0.7, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.11, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  noise.start(when);
  noise.stop(when + 0.16);
}

function playHat(when = audioContext.currentTime, open = false, destination = masterGain) {
  const noise = audioContext.createBufferSource();
  const length = open ? 0.12 : 0.045;
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(7200, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(open ? 0.1 : 0.064, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  noise.start(when);
  noise.stop(when + length);
}

function playBass(freq, when, length = 0.18, destination = masterGain) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.985, when + length);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(640, when);
  filter.frequency.exponentialRampToValueAtTime(180, when + length);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.24, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + length + 0.02);
}

function playChord(freqs, when, length = 0.5, destination = masterGain) {
  const chordGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, when);
  chordGain.gain.setValueAtTime(0.0001, when);
  chordGain.gain.exponentialRampToValueAtTime(0.09, when + 0.04);
  chordGain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  filter.connect(chordGain);
  chordGain.connect(destination);

  freqs.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq * (index === 1 ? 2 : 1), when);
    osc.detune.setValueAtTime((index - 1) * 7, when);
    osc.connect(filter);
    osc.start(when);
    osc.stop(when + length + 0.03);
  });
}

function playPad(freqs, when, length, destination = masterGain) {
  const padGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, when);
  filter.frequency.linearRampToValueAtTime(1400, when + length * 0.5);
  padGain.gain.setValueAtTime(0.0001, when);
  padGain.gain.exponentialRampToValueAtTime(0.045, when + length * 0.3);
  padGain.gain.setValueAtTime(0.045, when + length * 0.7);
  padGain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  filter.connect(padGain);
  padGain.connect(destination);

  freqs.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    osc.type = index === 0 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(freq, when);
    osc.detune.setValueAtTime((index - 1) * 6, when);
    osc.connect(filter);
    osc.start(when);
    osc.stop(when + length + 0.05);
  });
}

function playPluck(freq, when, destination = masterGain) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, when);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2600, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.055, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + 0.24);
}

// 연주형: 자동 반주(드럼/베이스/패드/멜로디 자동재생) 없음.
// 소리는 오직 플레이어가 노트를 누를 때 judgeLane()에서 난다.

// ===== 게임 흐름 =====
function now() {
  if (visualDemo && Number.isFinite(fixedDemoTime)) return fixedDemoTime;
  if (visualDemo && !started) return 1.4 + ((performance.now() * 0.001) % 4.8);
  if (!started) return 0;
  return performance.now() * 0.001 - startVisualTime;
}

function setPose(name, dur) {
  poseName = name;
  poseTimer = dur;
}

function startGame() {
  if (started) return;
  setupAudio();
  const resumePromise = audioContext.resume();
  if (audioStatus) audioStatus.textContent = `${selectedSong.title} // 게임 시작`;
  resetGame();
  startOverlay.classList.add("hidden");
  startOverlay.style.display = "none";

  const begin = (withAudio) => {
    const lead = 0.4;
    startAudioTime = audioContext.currentTime + lead;
    startVisualTime = performance.now() * 0.001 + lead;
    started = true;
    if (!withAudio) return;
    // 시작 큐만 한 번 울리고, 이후 소리는 플레이어의 노트 입력으로만.
    playStartCue(audioContext.currentTime + 0.01);
  };

  resumePromise
    .then(async () => {
      begin(true);
    })
    .catch(() => {
      if (audioStatus) audioStatus.textContent = "오디오는 브라우저 설정을 확인해 주세요";
      begin(false);
    });
}

function resetGame() {
  stopTrack();
  score = 0;
  combo = 0;
  maxCombo = 0;
  health = 100;
  gameOver = false;
  trauma = 0;
  particles = [];
  setPose("idol", 0);
  notes.forEach((note) => {
    note.hit = false;
    note.missed = false;
  });
  updateHud(0);
}

function judgeLane(lane) {
  if (!started) return;
  const t = now();
  const candidate = notes
    .filter((note) => note.lane === lane && !note.hit && !note.missed)
    .map((note) => ({ note, delta: Math.abs(note.time - t) }))
    .sort((a, b) => a.delta - b.delta)[0];

  keyButtons[lane].classList.add("active");
  window.setTimeout(() => keyButtons[lane].classList.remove("active"), 92);

  // 어떤 입력이든 항상 피아노 음을 낸다. 박자가 맞으면 그 노트 음, 아니면
  // 가까운(다음) 노트 음 또는 레인 대표음 → 곡 조성에서 벗어나지 않아 늘 듣기 좋다.
  const soundPitch = candidate ? candidate.note.pitch : lanePitches[lane];
  const onBeat = candidate && candidate.delta <= missWindow;
  playPiano(soundPitch, audioContext.currentTime, onBeat ? 1 : 0.62);

  if (!onBeat) {
    registerJudgment(lane, "BAD", 0, 0);
    health = Math.max(0, health - 2);
    combo = 0;
    setPose("idolMiss", 0.32);
    return;
  }

  candidate.note.hit = true;
  spawnHit(lane);

  if (candidate.delta <= perfectWindow) {
    registerJudgment(lane, "PERFECT", 1000, 1);
    if (!reduceMotion) trauma = Math.min(1, trauma + 0.45);
  } else if (candidate.delta <= greatWindow) {
    registerJudgment(lane, "GREAT", 700, 0.74);
  } else {
    registerJudgment(lane, "GOOD", 420, 0.42);
  }
}

function registerJudgment(lane, label, points, power) {
  judgeEls[lane].textContent = label;
  judgeEls[lane].style.color =
    label === "PERFECT" ? "#36e6ff" : label === "GREAT" ? "#55ff9a" : label === "GOOD" ? "#ffc857" : "#ff4d6d";

  if (points > 0) {
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    score += points + combo * 12;
    health = Math.min(100, health + power * 1.2);
    showToast(label);
    pulse = Math.max(pulse, power);
    if (combo > 0 && combo % 10 === 0) setPose("idolCheer", 0.55);
    else if (poseName !== "idolCheer") setPose("idolSing", 0.16);
  } else {
    showToast(label);
  }
}

function showToast(label) {
  toast.textContent = label;
  toast.classList.add("show");
  lastToastTimer = performance.now();
}

function spawnHit(lane) {
  const x = laneCenterX(lane, 1);
  const y = judgeY();
  receptorPop[lane] = 1;
  particles.push({ kind: "burst", lane, x, y, life: 0.34, max: 0.34, base: noteBase() * 1.5 });
  particles.push({ kind: "ring", lane, x, y, life: 0.42, max: 0.42, base: noteBase() * 1.3 });
  for (let i = 0; i < 7; i += 1) {
    const ang = (Math.PI * 2 * i) / 7 + Math.random();
    const sp = 90 + Math.random() * 140;
    particles.push({
      kind: "spark",
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 40,
      life: 0.4,
      max: 0.4,
      color: LANE_COLORS[lane],
    });
  }
  if (particles.length > 160) particles.splice(0, particles.length - 160);
}

function updateNotes(t) {
  notes.forEach((note) => {
    if (note.hit || note.missed) return;
    if (!visualDemo && t - note.time > missWindow) {
      note.missed = true;
      combo = 0;
      health = Math.max(0, health - 7);
      judgeEls[note.lane].textContent = "MISS";
      judgeEls[note.lane].style.color = "#ff4d6d";
      showToast("MISS");
      setPose("idolMiss", 0.32);
    }
  });
}

function updateParticles(dt) {
  particles = particles.filter((p) => {
    p.life -= dt;
    if (p.kind === "spark") {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt;
    }
    return p.life > 0;
  });
}

function endGame(cleared) {
  if (!started) return;
  started = false;
  gameOver = !cleared;
  stopTrack();
  commitBest();
  startOverlay.classList.remove("hidden");
  startOverlay.style.display = "";
  startButton.textContent = "RESTART";
  if (audioStatus) {
    audioStatus.textContent = cleared
      ? `${selectedSong.title} 완주! 점수 ${String(score).padStart(7, "0")}`
      : "싱크가 0이 되었어요 — 다시 도전!";
  }
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const min = Math.floor(safeSeconds / 60);
  const sec = String(safeSeconds % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function updateHud(t) {
  scoreEl.textContent = String(score).padStart(7, "0");
  if (bestEl) bestEl.textContent = `BEST ${String(Math.max(bestScore, score)).padStart(7, "0")}`;
  comboEl.textContent = String(combo);
  comboMeterEl.style.width = `${Math.min(100, (combo % 32) * 3.125)}%`;
  syncEl.textContent = `${Math.round(health)}%`;
  progressEl.style.width = `${Math.min(100, (t / songLength) * 100)}%`;
  timeEl.textContent = `${formatTime(t)} / ${formatTime(songLength)}`;
}

function loadBest() {
  try {
    const raw = Number(localStorage.getItem("mumu-best"));
    bestScore = Number.isFinite(raw) ? raw : 0;
  } catch {
    bestScore = 0;
  }
}

function commitBest() {
  if (score <= bestScore) return;
  bestScore = score;
  try {
    localStorage.setItem("mumu-best", String(bestScore));
  } catch {
    /* localStorage 불가 환경은 무시 */
  }
}

// ===== UI (주크박스 곡 선택) =====
function syncSelectedSongUi() {
  bpm = selectedSong.bpm;
  if (selectedSongTitle) selectedSongTitle.textContent = selectedSong.title;
  if (selectedSongComposer) selectedSongComposer.textContent = selectedSong.composer || "";
  if (selectedSongMeta) selectedSongMeta.textContent = `${selectedSong.difficulty} · ${selectedSong.lesson || ""}`;
  if (songIndexEl) songIndexEl.textContent = String(selectedSongIndex + 1).padStart(2, "0");
  if (hudTrackName) hudTrackName.textContent = selectedSong.title;
  if (hudBpm) hudBpm.textContent = String(selectedSong.bpm);
  if (hudDifficulty) hudDifficulty.textContent = selectedSong.difficulty;
  if (audioStatus) audioStatus.textContent = `${selectedSong.title} — 누르면 그 음이 울려요`;
  updateHud(0);
}

function selectSong(index) {
  selectedSongIndex = (index + songs.length) % songs.length;
  selectedSong = songs[selectedSongIndex];
  bpm = selectedSong.bpm;
  notes = buildChart();
  syncSelectedSongUi();
}

function renderJukebox() {
  if (songCountEl) songCountEl.textContent = String(songs.length).padStart(2, "0");
  carouselPrev?.addEventListener("click", () => selectSong(selectedSongIndex - 1));
  carouselNext?.addEventListener("click", () => selectSong(selectedSongIndex + 1));
}

// ===== 렌더링 =====
function drawBackground(beatPulse) {
  const bg = stageImg();
  ctx.fillStyle = "#06070d";
  ctx.fillRect(0, 0, W, H);
  if (bg && bg.width) {
    const scale = Math.max(W / bg.width, H / bg.height);
    const dw = bg.width * scale;
    const dh = bg.height * scale;
    ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  if (beatPulse > 0.02) {
    ctx.globalAlpha = beatPulse * 0.07;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function drawMascot(t, beatPhase) {
  const pose =
    poseTimer > 0 && IMG[poseName] && IMG[poseName].width ? IMG[poseName] : IMG.idol;
  if (!pose || !pose.width) return;
  const h = H * 0.4;
  const w = h * (pose.width / pose.height);
  const bop = started ? Math.abs(Math.sin(beatPhase * Math.PI)) * H * 0.014 : 0;
  const baseY = H * 0.46; // 무대 안쪽(소실점 근처)에 서서 하이웨이 위로 보이게
  ctx.drawImage(pose, W * 0.5 - w / 2, baseY - h - bop, w, h);
}

function drawHighway() {
  const tY = topY();
  const jY = judgeY();
  // 어두운 무대 패널
  ctx.beginPath();
  ctx.moveTo(laneCenterX(0, 0) - spread(0) * 0.5, tY);
  ctx.lineTo(laneCenterX(LANES - 1, 0) + spread(0) * 0.5, tY);
  ctx.lineTo(laneCenterX(LANES - 1, 1) + spread(1) * 0.5, jY);
  ctx.lineTo(laneCenterX(0, 1) - spread(1) * 0.5, jY);
  ctx.closePath();
  ctx.fillStyle = "rgba(4,6,16,0.6)";
  ctx.fill();

  for (let lane = 0; lane < LANES; lane += 1) {
    const halfT = spread(0) * 0.42;
    const halfB = spread(1) * 0.42;
    const xT = laneCenterX(lane, 0);
    const xB = laneCenterX(lane, 1);
    ctx.beginPath();
    ctx.moveTo(xT - halfT, tY);
    ctx.lineTo(xT + halfT, tY);
    ctx.lineTo(xB + halfB, jY);
    ctx.lineTo(xB - halfB, jY);
    ctx.closePath();
    ctx.fillStyle = LANE_COLORS[lane];
    ctx.globalAlpha = 0.1;
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.strokeStyle = LANE_COLORS[lane];
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 판정선
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(laneCenterX(0, 1) - spread(1) * 0.5, jY);
  ctx.lineTo(laneCenterX(LANES - 1, 1) + spread(1) * 0.5, jY);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawReceptors(dt) {
  const jY = judgeY();
  const size = spread(1) * 0.84;
  for (let lane = 0; lane < LANES; lane += 1) {
    if (receptorPop[lane] > 0) receptorPop[lane] = Math.max(0, receptorPop[lane] - dt * 4);
    const img = tintCache["receptor" + lane] || IMG.receptor;
    const pop = 1 + receptorPop[lane] * 0.35;
    const s = size * pop;
    const x = laneCenterX(lane, 1);
    if (img && img.width) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, x - s / 2, jY - s / 2, s, s);
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = LANE_COLORS[lane];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, jY, s * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawNotes(t) {
  // 먼 노트부터(작게) 그려 가까운 노트가 위로 오게
  for (let i = notes.length - 1; i >= 0; i -= 1) {
    const note = notes[i];
    if (note.hit || note.missed) continue;
    const p = 1 - (note.time - t) / approachTime;
    if (p < -0.06 || p > 1.08) continue;
    const x = laneCenterX(note.lane, p);
    const y = noteY(p);
    const s = noteBase() * laneScale(p);
    const img = tintCache["gem" + note.lane] || IMG.gem;
    ctx.globalAlpha = clamp(p * 4, 0, 1);
    if (img && img.width) {
      ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    } else {
      ctx.fillStyle = LANE_COLORS[note.lane];
      ctx.beginPath();
      ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawParticles() {
  particles.forEach((p) => {
    const k = clamp(p.life / p.max, 0, 1);
    if (p.kind === "burst" || p.kind === "ring") {
      const img = tintCache[(p.kind === "ring" ? "ring" : "burst") + p.lane] || IMG[p.kind === "ring" ? "ring" : "burst"];
      const grow = p.kind === "ring" ? 2.4 : 1.8;
      const s = p.base * (1 + (1 - k) * grow);
      ctx.globalAlpha = k * (p.kind === "ring" ? 0.85 : 1);
      if (img && img.width) ctx.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      const sz = 3 + k * 3;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
  });
}

function render(t, dt, beatPhase, beatPulse) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (trauma > 0) {
    const mag = trauma * trauma * 7;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  drawBackground(beatPulse);
  drawMascot(t, beatPhase);
  drawHighway();
  drawReceptors(dt);
  drawNotes(t);
  drawParticles();
  ctx.restore();
}

function animate() {
  requestAnimationFrame(animate);
  if (!W || !H) resize();
  const frameTime = performance.now();
  const dt = Math.min(0.05, (frameTime - lastFrameTime) / 1000);
  lastFrameTime = frameTime;
  const t = now();

  const beat = 60 / (bpm || 100);
  const beatPhase = (Math.max(0, t) % beat) / beat;
  const beatPulse = Math.max(0, 1 - beatPhase * 3.2);

  if (poseTimer > 0) {
    poseTimer -= dt;
    if (poseTimer <= 0) poseName = "idol";
  }
  pulse = Math.max(0, pulse - dt * 2.6);
  trauma = Math.max(0, trauma - dt * 2.2);
  updateParticles(dt);

  if (started || visualDemo) {
    updateNotes(t);
    updateHud(t);
    if (started && health <= 0) endGame(false);
    else if (started && t >= songLength) endGame(true);
  }

  if (performance.now() - lastToastTimer > 190) toast.classList.remove("show");

  render(t, dt, beatPhase, beatPulse);
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.clientWidth || window.innerWidth || document.documentElement.clientWidth || 360;
  H = canvas.clientHeight || window.innerHeight || document.documentElement.clientHeight || 640;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

// ===== 입력 =====
document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  const lane = laneKeys.get(event.code);
  if (lane !== undefined) {
    event.preventDefault();
    judgeLane(lane);
  }
  if (event.code === "Space") {
    event.preventDefault();
    startGame();
  }
  if (!started) {
    if (event.code === "ArrowLeft") {
      event.preventDefault();
      selectSong(selectedSongIndex - 1);
    }
    if (event.code === "ArrowRight") {
      event.preventDefault();
      selectSong(selectedSongIndex + 1);
    }
  }
});

keyButtons.forEach((button) => {
  button.addEventListener("pointerdown", () => judgeLane(Number(button.dataset.lane)));
});

// 첫 사용자 입력에서 오디오 컨텍스트 + 피아노 샘플을 미리 로드(브라우저 자동재생 정책 준수)
const primeAudio = () => {
  try {
    setupAudio();
  } catch {
    /* 컨텍스트 생성 실패는 무시 */
  }
  window.removeEventListener("pointerdown", primeAudio);
  window.removeEventListener("keydown", primeAudio);
};
window.addEventListener("pointerdown", primeAudio);
window.addEventListener("keydown", primeAudio);

startButton.addEventListener("click", startGame);
quickStartButton?.addEventListener("click", startGame);
window.addEventListener("resize", resize);

try {
  resize();
  loadAssets();
  loadBest();
  renderJukebox();
  bpm = selectedSong.bpm;
  notes = buildChart();
  syncSelectedSongUi();
  if (visualDemo) {
    startOverlay.classList.add("hidden");
    startOverlay.style.display = "none";
    health = 100;
  }
  animate();
} catch (error) {
  document.body.dataset.error = error.message;
  throw error;
}
