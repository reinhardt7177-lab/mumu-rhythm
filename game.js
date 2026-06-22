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
const songCarousel = document.querySelector("#songCarousel");
const selectedSongTitle = document.querySelector("#selectedSongTitle");
const selectedSongMeta = document.querySelector("#selectedSongMeta");
const carouselPrev = document.querySelector(".carousel-nav.prev");
const carouselNext = document.querySelector(".carousel-nav.next");

const laneKeys = new Map([
  ["KeyA", 0],
  ["KeyS", 1],
  ["KeyD", 2],
  ["KeyJ", 3],
  ["KeyK", 4],
]);

const LANES = 5;
const LANE_COLORS = ["#36e6ff", "#ff3fd4", "#ffc857", "#55ff9a", "#ffffff"];
const approachTime = 2.4; // 노트가 스폰→판정선까지 걸리는 시간(스크롤 속도)
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
let particles = [];
const receptorPop = [0, 0, 0, 0, 0];
let poseName = "idol";
let poseTimer = 0;
const urlParams = new URLSearchParams(window.location.search);
let visualDemo = urlParams.has("demo");
let fixedDemoTime = Number(urlParams.get("demoTime"));
let lastFrameTime = performance.now();
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const pianoNotes = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

const nurserySongs = [
  {
    id: "twinkle",
    title: "반짝반짝 작은 별",
    difficulty: "쉬움",
    bpm: 96,
    stage: "city",
    image: "./assets/songs/twinkle.png",
    lesson: "계이름 반복과 4박 감각",
    melody: ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"],
  },
  {
    id: "mary",
    title: "작은 양 메리",
    difficulty: "쉬움",
    bpm: 104,
    stage: "sunset",
    image: "./assets/songs/mary-lamb.png",
    lesson: "한 음씩 내려가는 멜로디",
    melody: ["E4", "D4", "C4", "D4", "E4", "E4", "E4", "D4", "D4", "D4", "E4", "G4", "G4"],
  },
  {
    id: "ode",
    title: "환희의 노래",
    difficulty: "보통",
    bpm: 108,
    stage: "arena",
    image: "./assets/songs/ode-joy.png",
    lesson: "순차 진행과 반복 리듬",
    melody: ["E4", "E4", "F4", "G4", "G4", "F4", "E4", "D4", "C4", "C4", "D4", "E4", "E4", "D4", "D4"],
  },
  {
    id: "eunhasu",
    title: "강진중앙초 은하수",
    difficulty: "보통",
    bpm: 150,
    duration: 194,
    stage: "galaxy",
    audio: "./assets/music/eunhasu.mp3",
    image: "./assets/intro-hero.png",
    lesson: "실제 노래에 맞춰 박자 탭",
  },
  {
    id: "morning",
    title: "강진중앙의 아침",
    difficulty: "어려움",
    bpm: 100,
    duration: 30,
    stage: "school",
    audio: "./assets/music/morning.mp3",
    image: "./assets/intro-hero.png",
    lesson: "빠른 연타 · 계단 런 · 동시치기",
  },
];

let selectedSongIndex = 0;
let selectedSong = nurserySongs[selectedSongIndex];

const scaleNotes = Object.keys(pianoNotes);

function shiftPitch(pitch, steps) {
  const index = scaleNotes.indexOf(pitch);
  if (index < 0) return pitch;
  return scaleNotes[Math.max(0, Math.min(scaleNotes.length - 1, index + steps))];
}

// ===== 채보 생성 (음높이→레인 매핑은 우리 게임의 교육 코어) =====
function difficultyProfile(difficulty) {
  switch (difficulty) {
    case "어려움":
      return { eighthSplit: true, doubleAccent: true, rotateLanes: true };
    case "보통":
      return { eighthSplit: true, doubleAccent: false, rotateLanes: true };
    default:
      return { eighthSplit: false, doubleAccent: false, rotateLanes: false };
  }
}

function makeRichArrangement(song, profile) {
  const base = song.melody;
  const verse = base.map((pitch) => ({ pitch, beats: 1, accent: false }));
  const answer = base.map((pitch, index) => ({
    pitch: index % 4 === 1 ? shiftPitch(pitch, 1) : pitch,
    beats: index === base.length - 1 ? 2 : 1,
    accent: index === base.length - 1,
  }));
  const sparkle = base.flatMap((pitch, index) => {
    if (profile.eighthSplit && index % 4 === 3) {
      return [{ pitch, beats: 0.5, accent: false }, { pitch: shiftPitch(pitch, 1), beats: 0.5, accent: false }];
    }
    if (profile.eighthSplit && index % 6 === 2) {
      return [{ pitch, beats: 0.5, accent: false }, { pitch: shiftPitch(pitch, -1), beats: 0.5, accent: false }];
    }
    return [{ pitch, beats: 1, accent: false }];
  });
  const cadence = [
    { pitch: base[0], beats: 1, accent: false },
    { pitch: shiftPitch(base[0], 2), beats: 1, accent: false },
    { pitch: shiftPitch(base[0], 4), beats: 1.5, accent: true },
    { pitch: shiftPitch(base[0], 2), beats: 0.5, accent: false },
    { pitch: base[0], beats: 2, accent: true },
  ];

  const phrase = [...verse, ...answer, ...sparkle, ...cadence];
  const targetBeats = (34 * song.bpm) / 60;
  const arranged = [];
  let totalBeats = 0;
  let cycle = 0;

  while (totalBeats < targetBeats) {
    phrase.forEach((item) => {
      arranged.push({ ...item, cycle });
      totalBeats += item.beats;
    });
    cycle += 1;
  }

  return arranged;
}

// 실제 MP3 트랙용: 박자 그리드 위 탭 노트
function buildAudioChart(song) {
  const duration = song.duration || 60;
  const scale = ["C4", "D4", "E4", "G4", "A4", "C5"];
  const hard = song.difficulty === "어려움";
  const interval = hard ? 0.42 : 0.8;
  const maxNotes = hard ? 280 : 170;
  const notesOut = [];

  const addNote = (lane, pitch, time) => {
    notesOut.push({ time: Number(time.toFixed(4)), lane, pitch, hit: false, missed: false });
  };

  let t = hard ? 2.6 : 3.2;
  let i = 0;
  let prevLane = -1;
  let dir = 1;
  while (t < duration - 1.4 && notesOut.length < maxNotes) {
    let lane;
    if (hard) {
      const block = Math.floor(i / 6) % 3;
      if (block === 0) {
        lane = prevLane < 0 ? 0 : prevLane + dir;
        if (lane > LANES - 1) {
          lane = LANES - 2;
          dir = -1;
        } else if (lane < 0) {
          lane = 1;
          dir = 1;
        }
      } else if (block === 1) {
        lane = [0, 4, 1, 3, 2][i % 5];
      } else {
        lane = Math.round(((Math.sin(i * 0.9) + 1) / 2) * (LANES - 1));
      }
    } else {
      lane = Math.round(((Math.sin(i * 0.6) + 1) / 2) * (LANES - 1));
      if (i % 5 === 4) lane = (lane + 2) % LANES;
    }
    if (lane === prevLane) lane = (lane + 1) % LANES;
    prevLane = lane;
    addNote(lane, scale[i % scale.length], t);

    if (hard && i % 4 === 0) {
      addNote((lane + 2) % LANES, scale[(i + 3) % scale.length], t);
    }

    i += 1;
    t += interval;
  }

  songLength = Math.ceil(Math.min(duration, t + 1.4));
  return notesOut;
}

function buildChart() {
  if (selectedSong.audio) return buildAudioChart(selectedSong);

  const notesOut = [];
  const beat = 60 / bpm;
  const profile = difficultyProfile(selectedSong.difficulty);
  const arrangedMelody = makeRichArrangement(selectedSong, profile);

  const indices = arrangedMelody.map((item) => Math.max(0, scaleNotes.indexOf(item.pitch)));
  const minIdx = Math.min(...indices);
  const span = Math.max(1, Math.max(...indices) - minIdx);

  const pushNote = (lane, pitch, t) => {
    notesOut.push({ time: Number(t.toFixed(4)), lane, pitch, hit: false, missed: false });
  };

  let time = 2;
  let prevLane = -1;
  arrangedMelody.forEach((item) => {
    const idx = Math.max(0, scaleNotes.indexOf(item.pitch));
    let lane = Math.round(((idx - minIdx) / span) * (LANES - 1));
    if (profile.rotateLanes) lane = (lane + item.cycle) % LANES;
    if (lane === prevLane) lane = (lane + 1) % LANES;
    prevLane = lane;

    pushNote(lane, item.pitch, time);

    if (profile.doubleAccent && item.accent) {
      pushNote((lane + 2) % LANES, item.pitch, time);
    }

    time += item.beats * beat;
  });

  songLength = Math.ceil(time + 2);
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
  return lerp(W * 0.05, W * 0.118, p);
}
function laneCenterX(lane, p) {
  return W * 0.5 + (lane - 2) * spread(p);
}
function noteY(p) {
  return lerp(topY(), judgeY(), Math.pow(clamp(p, 0, 1), 1.5));
}
function laneScale(p) {
  return lerp(0.42, 1.18, clamp(p, 0, 1));
}
function noteBase() {
  return H * 0.075;
}

// ===== 오디오 (Web Audio 합성 — 렌더러와 무관, 원본 유지) =====
function setupAudio() {
  if (audioContext) return;
  audioContext = new AudioContext({ latencyHint: "interactive" });
  masterGain = audioContext.createGain();
  compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;
  masterGain.gain.value = 1.25;
  masterGain.connect(compressor);
  compressor.connect(audioContext.destination);

  musicBus = audioContext.createGain();
  musicBus.gain.value = 0.8;
  musicBus.connect(masterGain);
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
  const freq = pianoNotes[pitch] ?? pianoNotes.C4;
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

  if (velocity > 0.8) {
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

function startBackingTrack() {
  const beat = 60 / bpm;
  const bar = beat * 4;
  const progression = [
    [pianoNotes.C4, pianoNotes.E4, pianoNotes.G4],
    [pianoNotes.F4, pianoNotes.A4, pianoNotes.C5],
    [pianoNotes.G4, pianoNotes.B4, pianoNotes.D5],
    [pianoNotes.C4, pianoNotes.E4, pianoNotes.G4],
  ];
  const totalBars = Math.ceil(songLength / bar);

  for (let barIndex = 0; barIndex < totalBars; barIndex += 1) {
    const barStart = startAudioTime + barIndex * bar;
    if (barIndex * bar >= songLength) break;
    const chord = progression[barIndex % progression.length];
    const [root, third, fifth] = chord;

    playPad(chord.map((freq) => freq / 2), barStart, bar * 0.98, musicBus);
    playBass(root / 2, barStart, beat * 1.6, musicBus);
    playBass(fifth / 2, barStart + beat * 2, beat * 1.6, musicBus);

    const arp = [root, fifth, third, fifth];
    for (let eighth = 0; eighth < 8; eighth += 1) {
      playPluck(arp[eighth % arp.length], barStart + eighth * (beat / 2), musicBus);
    }

    for (let b = 0; b < 4; b += 1) {
      const when = barStart + b * beat;
      if (b === 0 || b === 2) playKick(when, musicBus);
      else playSnare(when, musicBus);
      playHat(when, false, musicBus);
      playHat(when + beat / 2, b === 3, musicBus);
    }
  }

  notes.forEach((note) => {
    if (note.time >= songLength) return;
    playPiano(note.pitch, startAudioTime + note.time, 0.5, musicBus);
  });
}

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

    const trackBuffer = selectedSong.audio ? trackBuffers.get(selectedSong.audio) : null;
    if (trackBuffer) {
      stopTrack();
      trackSource = audioContext.createBufferSource();
      trackSource.buffer = trackBuffer;
      trackSource.connect(masterGain);
      trackSource.start(startAudioTime);
    } else {
      playStartCue(audioContext.currentTime + 0.01);
      playKick(audioContext.currentTime + 0.03);
      startBackingTrack();
    }
  };

  resumePromise
    .then(async () => {
      if (selectedSong.audio) {
        try {
          await ensureTrackLoaded(selectedSong.audio);
        } catch {
          /* 디코드 실패는 무시하고 합성 반주로 진행 */
        }
      }
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

  if (!candidate || candidate.delta > missWindow) {
    registerJudgment(lane, "BAD", 0, 0);
    health = Math.max(0, health - 4);
    combo = 0;
    setPose("idolMiss", 0.32);
    return;
  }

  candidate.note.hit = true;
  spawnHit(lane);
  if (selectedSong.audio) playClick(audioContext.currentTime);
  else playPiano(candidate.note.pitch, audioContext.currentTime, 1);

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

// ===== UI (캐러셀 / 곡 선택) =====
function syncSelectedSongUi() {
  bpm = selectedSong.bpm;
  if (selectedSongTitle) selectedSongTitle.textContent = selectedSong.title;
  if (selectedSongMeta) selectedSongMeta.textContent = `${selectedSong.difficulty} // ${selectedSong.lesson}`;
  if (hudTrackName) hudTrackName.textContent = selectedSong.title;
  if (hudBpm) hudBpm.textContent = String(selectedSong.bpm);
  if (hudDifficulty) hudDifficulty.textContent = selectedSong.difficulty;
  if (audioStatus) audioStatus.textContent = `${selectedSong.title} // 피아노 리듬 연습`;
  updateHud(0);
}

function selectSong(index) {
  selectedSongIndex = (index + nurserySongs.length) % nurserySongs.length;
  selectedSong = nurserySongs[selectedSongIndex];
  document.querySelectorAll(".song-card").forEach((card, cardIndex) => {
    card.classList.toggle("selected", cardIndex === selectedSongIndex);
  });
  bpm = selectedSong.bpm;
  notes = buildChart();
  syncSelectedSongUi();
  const selectedCard = document.querySelector(`.song-card[data-index="${selectedSongIndex}"]`);
  selectedCard?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function renderSongCarousel() {
  if (!songCarousel) return;
  songCarousel.innerHTML = nurserySongs
    .map(
      (song, index) => `
        <article class="song-card${index === selectedSongIndex ? " selected" : ""}" data-index="${index}">
          <img src="${song.image}" alt="${song.title} 이미지" />
          <div class="song-card-body">
            <h2>${song.title}</h2>
            <span class="difficulty">${song.difficulty}</span>
            <p>${song.lesson}</p>
          </div>
        </article>
      `,
    )
    .join("");

  songCarousel.querySelectorAll(".song-card").forEach((card) => {
    card.addEventListener("click", () => selectSong(Number(card.dataset.index)));
    card.addEventListener("dblclick", () => {
      selectSong(Number(card.dataset.index));
      startGame();
    });
  });
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
  ctx.lineTo(laneCenterX(4, 0) + spread(0) * 0.5, tY);
  ctx.lineTo(laneCenterX(4, 1) + spread(1) * 0.5, jY);
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
  ctx.lineTo(laneCenterX(4, 1) + spread(1) * 0.5, jY);
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
});

keyButtons.forEach((button) => {
  button.addEventListener("pointerdown", () => judgeLane(Number(button.dataset.lane)));
});

startButton.addEventListener("click", startGame);
quickStartButton?.addEventListener("click", startGame);
window.addEventListener("resize", resize);

try {
  resize();
  loadAssets();
  loadBest();
  renderSongCarousel();
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
