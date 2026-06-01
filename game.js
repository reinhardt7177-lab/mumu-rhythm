import * as THREE from "three";

const canvas = document.querySelector("#stage");
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

const laneColors = [0x36e6ff, 0xff3fd4, 0xffc857, 0x55ff9a, 0xffffff];
const laneX = [-3.6, -1.8, 0, 1.8, 3.6];
const spawnZ = -39;
const judgeZ = 7.8;
const approachTime = 2.9;
let bpm = 96;
let songLength = 36;
const perfectWindow = 0.045;
const greatWindow = 0.085;
const goodWindow = 0.135;
const missWindow = 0.18;

let renderer;
let scene;
let camera;
let textureLoader;
let noteAtlas;
let burstAtlas;
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
let chart = [];
let notes = [];
let beatLights = [];
let equalizerBars = [];
let particles = [];
let stageRings = [];
let crowdLights = [];
const urlParams = new URLSearchParams(window.location.search);
let visualDemo = urlParams.has("demo");
let fixedDemoTime = Number(urlParams.get("demoTime"));
let lastFrameTime = performance.now();

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
    image: "./assets/songs/twinkle.png",
    lesson: "계이름 반복과 4박 감각",
    melody: ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"],
  },
  {
    id: "mary",
    title: "작은 양 메리",
    difficulty: "쉬움",
    bpm: 104,
    image: "./assets/songs/mary-lamb.png",
    lesson: "한 음씩 내려가는 멜로디",
    melody: ["E4", "D4", "C4", "D4", "E4", "E4", "E4", "D4", "D4", "D4", "E4", "G4", "G4"],
  },
  {
    id: "ode",
    title: "환희의 노래",
    difficulty: "보통",
    bpm: 108,
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
    audio: "./assets/music/eunhasu.mp3",
    image: "./assets/intro-hero.png",
    lesson: "실제 노래에 맞춰 박자 탭",
  },
  {
    id: "morning",
    title: "강진중앙의 아침",
    difficulty: "쉬움",
    bpm: 100,
    duration: 30,
    audio: "./assets/music/morning.mp3",
    image: "./assets/intro-hero.png",
    lesson: "실제 노래에 맞춰 박자 탭",
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

// 난이도별로 채보의 밀도와 변화를 다르게 준다
function difficultyProfile(difficulty) {
  switch (difficulty) {
    case "어려움":
      return { eighthSplit: true, doubleAccent: true, rotateLanes: true };
    case "보통":
      return { eighthSplit: true, doubleAccent: false, rotateLanes: true };
    default: // 쉬움
      return { eighthSplit: false, doubleAccent: false, rotateLanes: false };
  }
}

function makeRichArrangement(song, profile) {
  const base = song.melody;
  // 본 구절: 기본 4분음표
  const verse = base.map((pitch) => ({ pitch, beats: 1, accent: false }));
  // 응답 구절: 살짝 변형하고 마지막 음을 길게 끌어 프레이즈를 마무리
  const answer = base.map((pitch, index) => ({
    pitch: index % 4 === 1 ? shiftPitch(pitch, 1) : pitch,
    beats: index === base.length - 1 ? 2 : 1,
    accent: index === base.length - 1,
  }));
  // 반짝 구절: 보통 이상에서만 꾸밈음을 8분음표 쌍으로 쪼개 리듬에 생기를 준다
  const sparkle = base.flatMap((pitch, index) => {
    if (profile.eighthSplit && index % 4 === 3) {
      return [{ pitch, beats: 0.5, accent: false }, { pitch: shiftPitch(pitch, 1), beats: 0.5, accent: false }];
    }
    if (profile.eighthSplit && index % 6 === 2) {
      return [{ pitch, beats: 0.5, accent: false }, { pitch: shiftPitch(pitch, -1), beats: 0.5, accent: false }];
    }
    return [{ pitch, beats: 1, accent: false }];
  });
  // 종지구: 점점 길어지는 음으로 단락을 닫는다
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

// 실제 MP3 트랙용 차트: 멜로디 전사가 없으므로 박자 그리드 위에 탭 노트를 흘린다.
// 레인은 사인파로 부드럽게 좌우를 오가며 가끔 점프해 단조로움을 던다.
function buildAudioChart(song) {
  const duration = song.duration || 60;
  const scale = ["C4", "D4", "E4", "G4", "A4", "C5"];
  const interval = 0.8;
  const maxNotes = 170;
  const notesOut = [];

  let t = 3.2; // 인트로 살짝 지나서 시작
  let i = 0;
  let prevLane = -1;
  while (t < duration - 2 && notesOut.length < maxNotes) {
    let lane = Math.round(((Math.sin(i * 0.6) + 1) / 2) * (laneX.length - 1));
    if (i % 5 === 4) lane = (lane + 2) % laneX.length; // 가끔 점프
    if (lane === prevLane) lane = (lane + 1) % laneX.length;
    prevLane = lane;
    notesOut.push({
      time: Number(t.toFixed(4)),
      lane,
      pitch: scale[i % scale.length],
      hit: false,
      missed: false,
      mesh: null,
      glow: null,
    });
    i += 1;
    t += interval;
  }

  songLength = Math.ceil(Math.min(duration, t + 2));
  return notesOut;
}

function buildChart() {
  if (selectedSong.audio) return buildAudioChart(selectedSong);

  const notesOut = [];
  const beat = 60 / bpm;
  const profile = difficultyProfile(selectedSong.difficulty);
  const arrangedMelody = makeRichArrangement(selectedSong, profile);

  // 곡의 실제 음역을 5레인 폭에 고르게 펴기 위한 정규화 범위
  const indices = arrangedMelody.map((item) => Math.max(0, scaleNotes.indexOf(item.pitch)));
  const minIdx = Math.min(...indices);
  const span = Math.max(1, Math.max(...indices) - minIdx);

  const pushNote = (lane, pitch, t) => {
    notesOut.push({
      time: Number(t.toFixed(4)),
      lane,
      pitch,
      hit: false,
      missed: false,
      mesh: null,
      glow: null,
    });
  };

  let time = 2;
  let prevLane = -1;
  arrangedMelody.forEach((item) => {
    const idx = Math.max(0, scaleNotes.indexOf(item.pitch));
    // 음높이를 레인 폭 전체로 정규화 (낮은음=왼쪽, 높은음=오른쪽)
    let lane = Math.round(((idx - minIdx) / span) * (laneX.length - 1));
    // 반복 구절마다 레인을 회전시켜 같은 멜로디라도 패턴이 달라지게
    if (profile.rotateLanes) lane = (lane + item.cycle) % laneX.length;
    // 같은 레인이 연달아 나오면 한 칸 비켜 패턴을 흩뜨린다
    if (lane === prevLane) lane = (lane + 1) % laneX.length;
    prevLane = lane;

    pushNote(lane, item.pitch, time);

    // 어려움: 강박/긴 음에 다른 레인 동시 노트를 더해 손맛을 준다
    if (profile.doubleAccent && item.accent) {
      pushNote((lane + 2) % laneX.length, item.pitch, time);
    }

    time += item.beats * beat;
  });

  songLength = Math.ceil(time + 2);

  return notesOut;
}

function setupThree() {
  textureLoader = new THREE.TextureLoader();
  // 노트와 히트 버스트는 같은 아틀라스를 공유한다 (행 오프셋만 다름)
  noteAtlas = textureLoader.load("./assets/note-effects-5.png");
  noteAtlas.colorSpace = THREE.SRGBColorSpace;
  burstAtlas = noteAtlas;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060b, 0.02);

  camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 9.2, 18.5);
  camera.lookAt(0, 0.35, -9);

  scene.add(new THREE.AmbientLight(0xa5c6ff, 0.6));

  const backLight = new THREE.PointLight(0xff3fd4, 22, 56);
  backLight.position.set(-8, 8, -18);
  scene.add(backLight);
  beatLights.push(backLight);

  const frontLight = new THREE.PointLight(0x36e6ff, 18, 54);
  frontLight.position.set(8, 7, 5);
  scene.add(frontLight);
  beatLights.push(frontLight);

  createStage();
  createNotes();
  window.addEventListener("resize", resize);
}

function createStage() {
  const backdropTexture = textureLoader.load("./assets/stage-backdrop.png");
  backdropTexture.colorSpace = THREE.SRGBColorSpace;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 25.875),
    new THREE.MeshBasicMaterial({
      map: backdropTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
  );
  backdrop.position.set(0, 5.6, -37);
  scene.add(backdrop);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a1024,
    metalness: 0.52,
    roughness: 0.22,
    emissive: 0x081a30,
    emissiveIntensity: 0.65,
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(15, 0.16, 62), floorMat);
  floor.position.set(0, -0.15, -18.6);
  scene.add(floor);

  const roadMat = new THREE.MeshBasicMaterial({
    color: 0x0b1d3d,
    transparent: true,
    opacity: 0.78,
  });
  const road = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.08, 56), roadMat);
  road.position.set(0, 0.05, -19.8);
  scene.add(road);

  laneX.forEach((x, lane) => {
    const mat = new THREE.MeshBasicMaterial({
      color: laneColors[lane],
      transparent: true,
      opacity: 0.11,
    });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.07, 54), mat);
    strip.position.set(x, 0.02, -19);
    scene.add(strip);

    const railMat = new THREE.MeshBasicMaterial({
      color: laneColors[lane],
      transparent: true,
      opacity: 0.86,
    });
    [-0.68, 0.68].forEach((offset) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 55), railMat);
      rail.position.set(x + offset, 0.14, -19.2);
      scene.add(rail);
    });

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 0.1, 0.44),
      new THREE.MeshBasicMaterial({ color: laneColors[lane], transparent: true, opacity: lane === 4 ? 0.76 : 0.9 }),
    );
    pad.position.set(x, 0.3, judgeZ + 0.13);
    scene.add(pad);
  });

  const judgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 });
  const judge = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.1, 0.18), judgeMat);
  judge.position.set(0, 0.38, judgeZ + 0.4);
  scene.add(judge);

  const ringColors = [0x36e6ff, 0xff3fd4, 0xffc857, 0x8d5bff];
  for (let i = 0; i < 7; i += 1) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColors[i % ringColors.length],
      transparent: true,
      opacity: 0.9 - i * 0.055,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15 + i * 0.42, 0.055, 12, 112), ringMat);
    ring.position.set(0, 4.6, -30.8);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    stageRings.push(ring);
  }

  const tunnelMat = new THREE.MeshBasicMaterial({
    color: 0x36e6ff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.9 + i * 1.42, 0.017, 8, 96), tunnelMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.18, -8.2 - i * 5.1);
    scene.add(ring);
  }

  for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
    const side = sideIndex === 0 ? -1 : 1;
    for (let i = 0; i < 18; i += 1) {
      const height = 1.2 + Math.random() * 5.8;
      const color = [0x36e6ff, 0xff3fd4, 0xffc857, 0x55ff9a][i % 4];
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, height, 0.34), mat);
      bar.position.set(side * (5.2 + i * 0.28), height / 2 - 0.04, -25.5 - Math.sin(i * 0.55) * 1.6);
      bar.userData.baseHeight = height;
      bar.userData.phase = Math.random() * Math.PI * 2;
      scene.add(bar);
      equalizerBars.push(bar);
    }
  }

  for (let i = 0; i < 130; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const color = [0x36e6ff, 0xff3fd4, 0xffc857, 0xffffff][i % 4];
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
    });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045 + Math.random() * 0.05, 8, 8), mat);
    dot.position.set(side * (4.9 + Math.random() * 7.2), 0.26 + Math.random() * 1.2, -30 + Math.random() * 29);
    dot.userData.phase = Math.random() * Math.PI * 2;
    scene.add(dot);
    crowdLights.push(dot);
  }

  for (let i = 0; i < 16; i += 1) {
    const color = [0x36e6ff, 0xff3fd4, 0xffc857, 0xffffff][i % 4];
    const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.54 });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 24), beamMat);
    const side = i % 2 === 0 ? -1 : 1;
    beam.position.set(side * (4.2 + (i % 4) * 0.76), 0.35, -8 - Math.floor(i / 4) * 4);
    beam.rotation.y = side * 0.22;
    scene.add(beam);
  }

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xff3fd4,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(3.1, 4.25, 96), haloMat);
  halo.position.set(0, 4.6, -31.2);
  halo.rotation.y = 0;
  scene.add(halo);

  const stageGlowMat = new THREE.MeshBasicMaterial({
    color: 0x36e6ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
  });
  const stageGlow = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), stageGlowMat);
  stageGlow.position.set(0, 2.7, -29.5);
  scene.add(stageGlow);
}

function createNotes() {
  chart = buildChart();
  notes = chart;

  notes.forEach((note) => {
    const texture = noteAtlas.clone();
    texture.needsUpdate = true;
    texture.repeat.set(0.2, 0.5);
    texture.offset.set(note.lane * 0.2, 0.5);

    const mat = new THREE.SpriteMaterial({
      map: texture,
      color: laneColors[note.lane],
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });
    const mesh = new THREE.Sprite(mat);
    mesh.scale.set(1.7, 1.7, 1);
    mesh.position.set(laneX[note.lane], 0.72, spawnZ);
    mesh.visible = false;
    scene.add(mesh);

    const glow = new THREE.PointLight(laneColors[note.lane], 0, 4.2);
    glow.position.copy(mesh.position);
    scene.add(glow);

    note.mesh = mesh;
    note.glow = glow;
  });
}

function clearNotes() {
  notes.forEach((note) => {
    if (note.mesh) {
      scene.remove(note.mesh);
      if (note.mesh.material?.map) note.mesh.material.map.dispose();
      note.mesh.material?.dispose();
    }
    if (note.glow) scene.remove(note.glow);
  });
  notes = [];
}

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
  // 먼저 차트를 다시 만들어 songLength를 갱신한 뒤 HUD를 동기화한다
  if (scene) {
    clearNotes();
    createNotes();
  }
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

  // 반주(패드·아르페지오·베이스·드럼·자동 멜로디)를 모으는 서브 버스.
  // 한곳에서 볼륨을 잡아 플레이어 타격음이 위로 떠오르게 한다.
  musicBus = audioContext.createGain();
  musicBus.gain.value = 0.8;
  musicBus.connect(masterGain);
}

// MP3 트랙을 받아 디코드해 캐시한다 (한 번만 디코드)
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

function now() {
  if (visualDemo && Number.isFinite(fixedDemoTime)) return fixedDemoTime;
  if (visualDemo && !started) return 1.4 + ((performance.now() * 0.001) % 4.8);
  if (!started) return 0;
  return performance.now() * 0.001 - startVisualTime;
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

// MP3 트랙 곡에서 노트를 칠 때의 가벼운 타격음 (실제 노래의 조성과 부딪히지 않게 음정 없는 클릭)
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

// 따뜻한 패드: 마디 내내 화음을 천천히 부풀려 빈 공간을 메운다
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

// 아르페지오 한 음: 짧고 부드러운 플럭으로 분산화음을 채운다
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
  // 마디별 화음 진행 (I–IV–V–I) — 동요에 두루 어울리는 안전한 흐름
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

    // 따뜻한 패드: 한 옥타브 낮게 마디 내내 지속
    playPad(chord.map((freq) => freq / 2), barStart, bar * 0.98, musicBus);

    // 베이스: 1박 루트, 3박 5도 (한 옥타브 아래)
    playBass(root / 2, barStart, beat * 1.6, musicBus);
    playBass(fifth / 2, barStart + beat * 2, beat * 1.6, musicBus);

    // 아르페지오: 8분음표로 분산화음(root-fifth-third-fifth)을 쉼 없이 흘린다
    const arp = [root, fifth, third, fifth];
    for (let eighth = 0; eighth < 8; eighth += 1) {
      playPluck(arp[eighth % arp.length], barStart + eighth * (beat / 2), musicBus);
    }

    // 드럼: 킥 1·3박, 스네어 2·4박(백비트), 하이햇 8분음표
    for (let b = 0; b < 4; b += 1) {
      const when = barStart + b * beat;
      if (b === 0 || b === 2) playKick(when, musicBus);
      else playSnare(when, musicBus);
      playHat(when, false, musicBus);
      playHat(when + beat / 2, b === 3, musicBus);
    }
  }

  // 멜로디 자동 반주: 채보의 멜로디를 은은하게 항상 깔아 곡이 끊기지 않게 한다.
  // 플레이어가 제때 치면 더 밝은 타격음(velocity 1)이 그 위에 얹힌다.
  notes.forEach((note) => {
    if (note.time >= songLength) return;
    playPiano(note.pitch, startAudioTime + note.time, 0.5, musicBus);
  });
}

function startGame() {
  if (started) return;
  setupAudio();
  const resumePromise = audioContext.resume();
  if (audioStatus) {
    audioStatus.textContent = `${selectedSong.title} // 게임 시작`;
  }
  resetGame();
  startOverlay.classList.add("hidden");
  startOverlay.style.display = "none";

  // 오디오 시계와 비주얼 시계를 같은 순간에 고정해 노트 판정과 반주 싱크를 맞춘다.
  // 오디오 재생이 막힌 환경에서도 시각 게임은 진행되도록 begin()을 양쪽에서 호출한다.
  const begin = (withAudio) => {
    const lead = 0.4;
    startAudioTime = audioContext.currentTime + lead;
    startVisualTime = performance.now() * 0.001 + lead;
    started = true;
    if (!withAudio) return;

    const trackBuffer = selectedSong.audio ? trackBuffers.get(selectedSong.audio) : null;
    if (trackBuffer) {
      // 실제 노래를 트랙으로 재생하고, 이 곡에선 합성 반주를 끈다
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
      // MP3 트랙 곡이면 먼저 디코드해 두고 시작 (디코드 실패 시 합성 반주로 폴백)
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
  notes.forEach((note) => {
    note.hit = false;
    note.missed = false;
    note.mesh.visible = false;
    note.glow.intensity = 0;
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
    return;
  }

  candidate.note.hit = true;
  candidate.note.mesh.visible = false;
  candidate.note.glow.intensity = 0;
  spawnBurst(laneX[lane], judgeZ, laneColors[lane]);
  // MP3 트랙 곡은 음정 없는 클릭, 합성 동요는 피아노 키음
  if (selectedSong.audio) playClick(audioContext.currentTime);
  else playPiano(candidate.note.pitch, audioContext.currentTime, 1);

  if (candidate.delta <= perfectWindow) {
    registerJudgment(lane, "PERFECT", 1000, 1);
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
  } else {
    showToast(label);
  }
}

function showToast(label) {
  toast.textContent = label;
  toast.classList.add("show");
  lastToastTimer = performance.now();
}

function spawnBurst(x, z, color) {
  const lane = laneX.reduce((closest, lanePos, index) => {
    const bestDistance = Math.abs(laneX[closest] - x);
    const distance = Math.abs(lanePos - x);
    return distance < bestDistance ? index : closest;
  }, 0);
  const burstTexture = burstAtlas.clone();
  burstTexture.needsUpdate = true;
  burstTexture.repeat.set(0.2, 0.5);
  burstTexture.offset.set(lane * 0.2, 0);

  const burst = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: burstTexture,
      color: laneColors[lane],
      transparent: true,
      opacity: 1,
      depthWrite: false,
    }),
  );
  burst.position.set(x, 0.78, z + 0.1);
  burst.scale.set(3.2, 3.2, 1);
  burst.userData.life = 1;
  burst.userData.kind = "sprite-burst";
  scene.add(burst);
  particles.push(burst);

  for (let i = 0; i < 16; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.28), mat);
    shard.position.set(x, 0.6, z);
    shard.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.16,
      0.04 + Math.random() * 0.12,
      (Math.random() - 0.5) * 0.22,
    );
    shard.userData.life = 1;
    scene.add(shard);
    particles.push(shard);
  }
}

function updateNotes(t) {
  notes.forEach((note) => {
    if (note.hit) return;
    const timeUntil = note.time - t;
    const visible = timeUntil < approachTime + 0.18 && timeUntil > -missWindow;

    if (visible) {
      const progress = 1 - timeUntil / approachTime;
      const z = THREE.MathUtils.lerp(spawnZ, judgeZ, progress);
      const y = 0.72 + Math.sin(progress * Math.PI) * 0.24;
      note.mesh.position.set(laneX[note.lane], y, z);
      note.mesh.rotation.x += 0.026;
      note.mesh.rotation.y += 0.038;
      note.mesh.visible = true;
      note.glow.position.copy(note.mesh.position);
      note.glow.intensity = 2.8 + progress * 4.2;
    } else {
      note.mesh.visible = false;
      note.glow.intensity = 0;
    }

    if (!visualDemo && !note.missed && t - note.time > missWindow) {
      note.missed = true;
      note.mesh.visible = false;
      combo = 0;
      health = Math.max(0, health - 7);
      judgeEls[note.lane].textContent = "MISS";
      judgeEls[note.lane].style.color = "#ff4d6d";
      showToast("MISS");
    }
  });
}

function updateStage(t, dt) {
  const beat = 60 / 165;
  const beatPhase = (t % beat) / beat;
  const beatPulse = Math.max(0, 1 - beatPhase * 3.4);
  pulse = Math.max(0, pulse - dt * 2.6);

  beatLights.forEach((light, i) => {
    light.intensity = 14 + beatPulse * 16 + pulse * 18 + i * 3;
  });

  equalizerBars.forEach((bar, i) => {
    const amp = 0.52 + Math.sin(t * 5 + bar.userData.phase) * 0.28 + beatPulse * 0.5;
    const height = Math.max(0.32, bar.userData.baseHeight * amp);
    bar.scale.y = height / bar.userData.baseHeight;
    bar.material.opacity = 0.62 + Math.min(0.38, amp * 0.2 + pulse * 0.18);
  });

  stageRings.forEach((ring, i) => {
    ring.rotation.z += dt * (0.18 + i * 0.02);
    ring.scale.setScalar(1 + beatPulse * 0.025 + pulse * 0.02);
    ring.material.opacity = 0.44 + beatPulse * 0.4 + pulse * 0.24 - i * 0.034;
  });

  crowdLights.forEach((dot) => {
    dot.material.opacity = 0.3 + Math.max(0, Math.sin(t * 4.5 + dot.userData.phase)) * 0.65;
  });

  particles = particles.filter((particle) => {
    particle.userData.life -= dt * 1.8;
    if (particle.userData.kind === "sprite-burst") {
      const scale = 3.2 + (1 - particle.userData.life) * 2.4;
      particle.scale.set(scale, scale, 1);
    } else {
      particle.position.add(particle.userData.velocity);
      particle.userData.velocity.y -= dt * 0.18;
      particle.rotation.x += 0.1;
      particle.rotation.y += 0.08;
    }
    particle.material.opacity = Math.max(0, particle.userData.life);
    if (particle.userData.life <= 0) {
      scene.remove(particle);
      if (particle.geometry) particle.geometry.dispose();
      if (particle.material.map) particle.material.map.dispose();
      particle.material.dispose();
      return false;
    }
    return true;
  });

  camera.position.x = Math.sin(t * 0.8) * 0.18;
  camera.position.y = 9.2 + pulse * 0.26;
  camera.lookAt(0, 0.35 + pulse * 0.16, -9);
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

function animate() {
  requestAnimationFrame(animate);
  const frameTime = performance.now();
  const dt = Math.min(0.05, (frameTime - lastFrameTime) / 1000);
  lastFrameTime = frameTime;
  const t = now();

  if (started || visualDemo) {
    updateNotes(t);
    updateHud(t);
    if (started && health <= 0) {
      endGame(false);
    } else if (started && t >= songLength) {
      endGame(true);
    }
  }

  if (performance.now() - lastToastTimer > 190) {
    toast.classList.remove("show");
  }

  updateStage(t, dt);
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

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
  button.addEventListener("pointerdown", () => {
    const lane = Number(button.dataset.lane);
    judgeLane(lane);
  });
});

startButton.addEventListener("click", startGame);
quickStartButton?.addEventListener("click", startGame);

try {
  loadBest();
  renderSongCarousel();
  syncSelectedSongUi();
  setupThree();
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
