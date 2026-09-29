import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Library,
  Music2,
  MousePointerClick,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Smartphone,
  Sparkles,
  Trophy,
  Volume2,
  X,
  createIcons,
} from "lucide";
import "./styles.css";
import { songDurationSeconds, songs } from "./content/songs";
import { AudioEngine } from "./engine/audio";
import { RhythmGame, type GameSnapshot, type JudgeEvent } from "./engine/game";
import { StageRenderer } from "./engine/renderer";
import { MvRenderer, type MvMode } from "./render/mvRenderer";
import { parseQualitySetting, resolveQuality, type QualityProfile, type QualitySetting } from "./render/quality";
import { SkiaEffectsRenderer } from "./render/skiaEffects";
import { drawSongArt } from "./render/songArt";
import { computeViewportLayout, type ViewportLayout } from "./render/stageLayout";
import { VisualTimeline, type MvScene, type VisualFrame } from "./render/visualTimeline";
import type { GameResult, ScreenName, Song, SongSection } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("앱을 시작할 수 없습니다.");

const SCENE_LABELS: Record<MvScene, { title: string; hint: string }> = {
  portal: { title: "포털 카운트인", hint: "박을 세며 준비해요" },
  city: { title: "리듬 도시", hint: "창문 불빛이 박에 맞춰 켜져요" },
  ribbon: { title: "가락 리본", hint: "리본의 높낮이가 곧 올 가락이에요" },
  listen: { title: "감상 구간", hint: "노트를 쉬고 소리의 층을 들어요" },
  kaleido: { title: "만화경 피날레", hint: "모든 소리가 모여 커져요" },
};
const SCENE_ORDER: MvScene[] = ["portal", "city", "listen", "ribbon", "kaleido"];

app.innerHTML = `
  <main class="app-shell" data-screen="library">
    <section id="libraryScreen" class="screen library-screen" aria-labelledby="libraryTitle">
      <header class="topbar">
        <a class="brand" href="#" aria-label="MUMU 리듬 스튜디오 처음 화면">
          <span class="brand-mark" aria-hidden="true"><i data-lucide="music-2"></i></span>
          <span><strong>MUMU</strong><small>리듬 스튜디오</small></span>
        </a>
        <div class="topbar-label"><span>CLASSIC + SYNTH</span><strong>뮤직 액션 컬렉션</strong></div>
        <button class="icon-button settings-open" type="button" aria-label="설정" title="설정"><i data-lucide="settings"></i></button>
      </header>

      <div class="library-layout">
        <section class="library-intro">
          <p class="eyebrow">초등 음악 감상 활동</p>
          <h1 id="libraryTitle">음악을 듣고<br />바를 터뜨려요</h1>
          <p>실제 클래식 연주와 오리지널 신스 트랙을 들으며 비트 라인의 노트를 터뜨리고 소리의 층과 가락을 발견합니다.</p>
          <dl class="program-facts">
            <div><dt>5</dt><dd>뮤직 스테이지</dd></div>
            <div><dt>5</dt><dd>음높이 레인</dd></div>
            <div><dt>1</dt><dd>곡마다 귀 미션</dd></div>
          </dl>
          <div class="carousel-controls" aria-label="곡 목록 이동">
            <button id="songPrev" class="icon-button square" type="button" aria-label="이전 곡" title="이전 곡"><i data-lucide="chevron-left"></i></button>
            <button id="songNext" class="icon-button square" type="button" aria-label="다음 곡" title="다음 곡"><i data-lucide="chevron-right"></i></button>
          </div>
        </section>

        <section class="program-board" aria-labelledby="programTitle">
          <header class="program-heading">
            <div><p class="eyebrow">오늘의 프로그램</p><h2 id="programTitle">연주할 곡을 고르세요</h2></div>
            <span id="programDuration"></span>
          </header>
          <div id="songGrid" class="song-carousel" aria-label="곡 선택"></div>
        </section>
      </div>

      <footer class="library-footer">
        <span><i data-lucide="headphones"></i> 헤드폰 또는 교실 스피커</span>
        <span><i data-lucide="mouse-pointer-click"></i> 떨어지는 노트 바를 직접 터치</span>
      </footer>
    </section>

    <section id="missionScreen" class="screen mission-screen" hidden aria-labelledby="missionSongTitle">
      <canvas id="missionArt" class="screen-art" aria-hidden="true"></canvas>
      <header class="overlay-topbar">
        <button id="missionBack" class="icon-button glass" type="button" aria-label="곡 선택으로 돌아가기" title="뒤로"><i data-lucide="arrow-left"></i></button>
        <span id="missionTrackMeta" class="track-meta"></span>
        <button class="icon-button glass settings-open" type="button" aria-label="설정" title="설정"><i data-lucide="settings"></i></button>
      </header>

      <div class="mission-layout">
        <section class="mission-copy">
          <p id="missionEyebrow" class="eyebrow light-text"></p>
          <h2 id="missionSongTitle"></h2>
          <p id="missionSubtitle" class="song-subtitle"></p>
          <div class="mission-origin"><span id="missionInstrument"></span><strong id="missionOrigin"></strong></div>
        </section>

        <section class="listening-brief" aria-labelledby="missionTitle">
          <p class="eyebrow">오늘의 귀 미션</p>
          <h3 id="missionTitle"></h3>
          <p id="missionDescription"></p>
          <dl>
            <div><dt>집중해서 들을 것</dt><dd id="missionFocus"></dd></div>
            <div><dt>등장 악기</dt><dd id="missionInstruments"></dd></div>
          </dl>
        </section>
      </div>

      <div class="mission-dock">
        <button id="previewButton" class="secondary-button glass-action" type="button"><i data-lucide="volume-2"></i><span>12초 미리 듣기</span></button>
        <div class="pop-preview" aria-label="다섯 색의 노트 바를 직접 터치">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <button id="startButton" class="primary-button" type="button"><span>연주 시작</span><i data-lucide="play"></i></button>
        <p id="missionAudioStatus" class="audio-status" aria-live="polite"></p>
      </div>
    </section>

    <section id="gameScreen" class="screen game-screen" hidden aria-label="리듬 연주 화면">
      <canvas id="mv" class="mv-layer" aria-hidden="true"></canvas>
      <canvas id="mvFallback" class="mv-layer" aria-hidden="true" hidden></canvas>
      <aside id="mvLeft" class="mv-caption mv-left" aria-hidden="true">
        <small id="mvSceneIndex">01 / 05</small>
        <strong id="mvSceneName">포털 카운트인</strong>
        <span id="mvSceneHint">박을 세며 준비해요</span>
        <ol class="scene-steps">${SCENE_ORDER.map((scene) => `<li data-scene="${scene}">${SCENE_LABELS[scene].title}</li>`).join("")}</ol>
      </aside>
      <aside id="mvRight" class="mv-caption mv-right" aria-hidden="true">
        <small>NOW PLAYING</small>
        <strong id="mvSongTitle"></strong>
        <span id="mvSongMeta"></span>
        <div class="beat-dots" id="beatDots"></div>
        <div class="energy-meter"><span id="energyBar"></span></div>
      </aside>

      <div id="stageFrame" class="stage-frame">
        <canvas id="stage" aria-label="떨어지는 노트 바를 직접 누르는 음악 스테이지"></canvas>
        <canvas id="skiaFx" aria-hidden="true"></canvas>
        <header class="game-hud">
          <div class="hud-track"><span id="hudNumber"></span><strong id="hudTitle"></strong></div>
          <div class="score-status">
            <span><small>SCORE</small><strong id="scoreValue">0</strong></span>
            <span><small>COMBO</small><strong id="comboValue">0</strong></span>
          </div>
          <button id="pauseButton" class="icon-button game-control" type="button" aria-label="일시정지" title="일시정지"><i data-lucide="pause"></i></button>
        </header>
        <div class="progress-track" aria-hidden="true"><span id="gameProgress"></span></div>
        <p id="sectionLabel" class="section-label">준비</p>
        <div id="sectionCallout" class="section-callout" aria-live="polite"></div>
        <div id="judgeText" class="judge-text" aria-hidden="true"></div>
      </div>

      <div id="rotateNotice" class="rotate-notice" role="alert" hidden>
        <span class="rotate-icon" aria-hidden="true"><i data-lucide="smartphone"></i></span>
        <strong>휴대폰을 세로로 돌려 주세요</strong>
        <p>연주를 잠시 멈췄어요. 세로 화면에서 재생 버튼을 누르면 이어서 연주해요.</p>
      </div>
    </section>

    <section id="resultScreen" class="screen result-screen" hidden aria-labelledby="resultTitle">
      <canvas id="resultArt" class="screen-art" aria-hidden="true"></canvas>
      <header class="overlay-topbar">
        <a class="brand brand-light" href="#" aria-label="MUMU 리듬 스튜디오 처음 화면">
          <span class="brand-mark" aria-hidden="true"><i data-lucide="music-2"></i></span>
          <span><strong>MUMU</strong><small>리듬 스튜디오</small></span>
        </a>
        <span id="resultBest" class="track-meta"></span>
      </header>

      <div class="result-layout">
        <section class="result-summary">
          <p class="eyebrow light-text">연주를 마쳤어요</p>
          <h2 id="resultTitle"></h2>
          <div id="resultStars" class="result-stars" aria-label="리듬 별"></div>
          <div class="result-metrics">
            <span><small>노트 수집률</small><strong id="accuracyValue"></strong></span>
            <span><small>최고 콤보</small><strong id="maxComboValue"></strong></span>
            <span><small>점수</small><strong id="resultScoreValue"></strong></span>
          </div>
          <p id="resultJudges" class="result-judges"></p>
        </section>

        <section class="listening-check" aria-labelledby="questionTitle">
          <p class="eyebrow">귀 미션 확인</p>
          <h3 id="questionTitle"></h3>
          <div id="answerOptions" class="answer-options"></div>
          <p id="answerFeedback" class="answer-feedback" aria-live="polite"></p>
          <div id="earnedBadge" class="earned-badge" hidden>
            <span aria-hidden="true"><i data-lucide="sparkles"></i></span>
            <div><small>새 감상 배지</small><strong id="badgeName"></strong></div>
          </div>
        </section>
      </div>

      <div class="result-actions">
        <button id="libraryButton" class="secondary-button glass-action" type="button"><i data-lucide="library"></i><span>다른 곡</span></button>
        <button id="retryButton" class="primary-button" type="button"><span>한 번 더</span><i data-lucide="rotate-ccw"></i></button>
      </div>
    </section>

    <dialog id="settingsDialog" class="settings-dialog">
      <form method="dialog">
        <header><div><p class="eyebrow">교실 소리·화면 맞춤</p><h2>설정</h2></div><button class="icon-button" value="close" aria-label="닫기" title="닫기"><i data-lucide="x"></i></button></header>
        <label class="volume-control"><span>전체 음량 <strong id="volumeValue">88%</strong></span><input id="volumeInput" type="range" min="0" max="100" step="5" value="88" /></label>
        <label class="volume-control"><span>소리 타이밍 <strong id="timingValue">0 ms</strong></span><input id="timingInput" type="range" min="-250" max="250" step="10" value="0" /></label>
        <p id="latencyInfo" class="latency-info">현재 출력 지연을 확인하고 있어요.</p>
        <label class="volume-control"><span>화면 효과 품질 <strong id="qualityValue">자동</strong></span>
          <select id="qualityInput">
            <option value="auto">자동</option>
            <option value="high">높음 · MV 최고 화질</option>
            <option value="mid">보통 · MV 45fps</option>
            <option value="low">낮음 · MV 30fps, Skia 끔</option>
          </select>
        </label>
        <button id="resetRecords" class="text-button" type="button">이 기기의 기록 초기화</button>
      </form>
    </dialog>
  </main>
`;

const iconSet = { ArrowLeft, ChevronLeft, ChevronRight, Headphones, Library, Music2, MousePointerClick, Pause, Play, RotateCcw, Settings, Smartphone, Sparkles, Trophy, Volume2, X };
const refreshIcons = (): void => createIcons({ icons: iconSet, attrs: { "stroke-width": 2, "aria-hidden": "true" } });

const select = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`화면 요소를 찾을 수 없습니다: ${selector}`);
  return element;
};

const shell = select<HTMLElement>(".app-shell");
const songGrid = select<HTMLDivElement>("#songGrid");
const missionArt = select<HTMLCanvasElement>("#missionArt");
const missionTrackMeta = select<HTMLElement>("#missionTrackMeta");
const missionEyebrow = select<HTMLElement>("#missionEyebrow");
const missionSongTitle = select<HTMLElement>("#missionSongTitle");
const missionSubtitle = select<HTMLElement>("#missionSubtitle");
const missionTitle = select<HTMLElement>("#missionTitle");
const missionDescription = select<HTMLElement>("#missionDescription");
const missionInstrument = select<HTMLElement>("#missionInstrument");
const missionOrigin = select<HTMLElement>("#missionOrigin");
const missionFocus = select<HTMLElement>("#missionFocus");
const missionInstruments = select<HTMLElement>("#missionInstruments");
const missionAudioStatus = select<HTMLElement>("#missionAudioStatus");
const previewButton = select<HTMLButtonElement>("#previewButton");
const startButton = select<HTMLButtonElement>("#startButton");
const resultArt = select<HTMLCanvasElement>("#resultArt");
const resultTitle = select<HTMLElement>("#resultTitle");
const resultStars = select<HTMLElement>("#resultStars");
const resultBest = select<HTMLElement>("#resultBest");
const accuracyValue = select<HTMLElement>("#accuracyValue");
const maxComboValue = select<HTMLElement>("#maxComboValue");
const resultScoreValue = select<HTMLElement>("#resultScoreValue");
const resultJudges = select<HTMLElement>("#resultJudges");
const questionTitle = select<HTMLElement>("#questionTitle");
const answerOptions = select<HTMLElement>("#answerOptions");
const answerFeedback = select<HTMLElement>("#answerFeedback");
const earnedBadge = select<HTMLElement>("#earnedBadge");
const badgeName = select<HTMLElement>("#badgeName");
const settingsDialog = select<HTMLDialogElement>("#settingsDialog");
const volumeInput = select<HTMLInputElement>("#volumeInput");
const volumeValue = select<HTMLElement>("#volumeValue");
const timingInput = select<HTMLInputElement>("#timingInput");
const timingValue = select<HTMLElement>("#timingValue");
const qualityInput = select<HTMLSelectElement>("#qualityInput");
const qualityValue = select<HTMLElement>("#qualityValue");
const latencyInfo = select<HTMLElement>("#latencyInfo");
const gameScreen = select<HTMLElement>("#gameScreen");
const stageFrame = select<HTMLElement>("#stageFrame");
const canvas = select<HTMLCanvasElement>("#stage");
const skiaCanvas = select<HTMLCanvasElement>("#skiaFx");
const mvCanvas = select<HTMLCanvasElement>("#mv");
const mvFallbackCanvas = select<HTMLCanvasElement>("#mvFallback");
const scoreValue = select<HTMLElement>("#scoreValue");
const comboValue = select<HTMLElement>("#comboValue");
const hudTitle = select<HTMLElement>("#hudTitle");
const hudNumber = select<HTMLElement>("#hudNumber");
const sectionLabel = select<HTMLElement>("#sectionLabel");
const gameProgress = select<HTMLElement>("#gameProgress");
const sectionCallout = select<HTMLElement>("#sectionCallout");
const judgeText = select<HTMLElement>("#judgeText");
const pauseButton = select<HTMLButtonElement>("#pauseButton");
const gameHud = select<HTMLElement>(".game-hud");
const progressTrack = select<HTMLElement>(".progress-track");
const rotateNotice = select<HTMLElement>("#rotateNotice");
const mvSceneIndex = select<HTMLElement>("#mvSceneIndex");
const mvSceneName = select<HTMLElement>("#mvSceneName");
const mvSceneHint = select<HTMLElement>("#mvSceneHint");
const mvSongTitle = select<HTMLElement>("#mvSongTitle");
const mvSongMeta = select<HTMLElement>("#mvSongMeta");
const beatDots = select<HTMLElement>("#beatDots");
const energyBar = select<HTMLElement>("#energyBar");
const sceneSteps = [...document.querySelectorAll<HTMLLIElement>(".scene-steps li")];

const screenElements: Record<ScreenName, HTMLElement> = {
  library: select("#libraryScreen"),
  mission: select("#missionScreen"),
  game: gameScreen,
  result: select("#resultScreen"),
};

const QUALITY_KEY = "mumu-music-v7-quality";
const QUALITY_LABELS: Record<QualitySetting, string> = { auto: "자동", high: "높음", mid: "보통", low: "낮음" };
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarseQuery = window.matchMedia("(pointer: coarse)");

const audio = new AudioEngine();
let selectedSong: Song = songs[0];
let latestResult: GameResult | null = null;
let screen: ScreenName = "library";
let feedbackTimer = 0;
let sectionTimer = 0;
let lastHudUpdate = 0;
let lastSnapshot: GameSnapshot | null = null;
let previewing = false;
let previewTimer = 0;
let qualitySetting: QualitySetting = parseQualitySetting(localStorage.getItem(QUALITY_KEY));
let profile: QualityProfile = currentProfile();
let viewportLayout: ViewportLayout = computeViewportLayout(window.innerWidth, window.innerHeight);
let timeline: VisualTimeline | null = null;
let lastScene: MvScene | null = null;
let lastBeatDot = -1;
let rotatePaused = false;
const activePointers = new Map<number, string>();
const activeKeys = new Map<string, string>();

const renderer = new StageRenderer(canvas, selectedSong);
const skiaEffects = new SkiaEffectsRenderer(skiaCanvas);
const mv = new MvRenderer(mvCanvas, mvFallbackCanvas);
const game = new RhythmGame(audio, {
  onFrame: handleFrame,
  onJudge: handleJudge,
  onSection: handleSection,
  onComplete: handleComplete,
});

skiaEffects.onActiveChange = () => syncEffectOwnership();
mv.onModeChange = (mode: MvMode) => { gameScreen.dataset.mv = mode; };

function currentProfile(): QualityProfile {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return resolveQuality(qualitySetting, {
    devicePixelRatio: window.devicePixelRatio || 1,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    reducedMotion: motionQuery.matches,
    coarsePointer: coarseQuery.matches,
  });
}

function applyProfile(): void {
  profile = currentProfile();
  const reduced = motionQuery.matches;
  renderer.setReducedMotion(reduced);
  renderer.setParticleScale(profile.particles);
  skiaEffects.setReducedMotion(reduced);
  skiaEffects.setParticleScale(profile.particles);
  mv.setReducedMotion(reduced);
  shell.dataset.quality = profile.level;
  syncEffectOwnership();
  if (screen === "game") syncGameLayout();
}

/** Skia owns lane light/hold energy/debris when active; otherwise Canvas 2D draws a light fallback. */
function syncEffectOwnership(): void {
  const skiaOn = profile.skia && skiaEffects.active;
  skiaCanvas.hidden = !skiaOn;
  renderer.setFallbackEffects(!skiaOn);
  if (!skiaOn) skiaEffects.clear();
}

function formatTime(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function bestScoreKey(songId: string): string {
  return `mumu-music-v4-best-${songId}`;
}

function getBest(songId: string): number {
  return Number(localStorage.getItem(bestScoreKey(songId))) || 0;
}

function showScreen(next: ScreenName): void {
  screen = next;
  shell.dataset.screen = next;
  Object.entries(screenElements).forEach(([name, element]) => { element.hidden = name !== next; });
  window.scrollTo(0, 0);
  refreshIcons();
  if (next === "mission") drawSongArt(missionArt, selectedSong, "hero");
  if (next === "result") drawSongArt(resultArt, selectedSong, "hero");
  if (next !== "game") rotateNotice.hidden = true;
}

function renderLibrary(): void {
  const totalSeconds = songs.reduce((sum, song) => sum + songDurationSeconds(song), 0);
  select<HTMLElement>("#programDuration").textContent = `${songs.length}곡 · 약 ${Math.round(totalSeconds / 60)}분`;
  songGrid.innerHTML = songs.map((song, index) => `
    <button class="song-card" type="button" data-song-index="${index}" style="--song-accent:${song.palette.accent};--song-deep:${song.palette.deep}">
      <span class="song-art-wrap">
        <canvas class="song-art" data-song-index="${index}" aria-hidden="true"></canvas>
        <span class="song-number">${song.number}</span>
        <span class="play-mark" aria-hidden="true"><i data-lucide="play"></i></span>
        <span class="difficulty-badge">${song.difficulty}</span>
      </span>
      <span class="song-card-copy">
        <small>${song.featuredInstrument} · ${song.bpm} BPM</small>
        <strong>${song.title}</strong>
        <span>${song.subtitle}</span>
        <em><span>${formatTime(songDurationSeconds(song))}</span><span>${song.listeningPoint}</span></em>
      </span>
    </button>
  `).join("");
  songGrid.querySelectorAll<HTMLButtonElement>(".song-card").forEach((card) => {
    card.addEventListener("click", () => openMission(songs[Number(card.dataset.songIndex)]));
  });
  refreshIcons();
  drawLibraryArt();
}

function drawLibraryArt(): void {
  songGrid.querySelectorAll<HTMLCanvasElement>("canvas.song-art").forEach((art) => {
    drawSongArt(art, songs[Number(art.dataset.songIndex)], "card");
  });
}

function applySongPalette(song: Song): void {
  shell.style.setProperty("--ink", song.palette.ink);
  shell.style.setProperty("--deep", song.palette.deep);
  shell.style.setProperty("--accent", song.palette.accent);
  shell.style.setProperty("--warm", song.palette.warm);
  shell.style.setProperty("--mist", song.palette.mist);
}

function openMission(song: Song): void {
  audio.stop();
  selectedSong = song;
  applySongPalette(song);
  missionTrackMeta.textContent = `${song.number} · ${song.beatsPerBar}박 · ${song.bpm} BPM · ${formatTime(songDurationSeconds(song))}`;
  missionEyebrow.textContent = song.mission.eyebrow;
  missionSongTitle.textContent = song.title;
  missionSubtitle.textContent = song.subtitle;
  missionTitle.textContent = song.mission.title;
  missionDescription.textContent = song.mission.description;
  missionInstrument.textContent = song.featuredInstrument;
  missionOrigin.textContent = song.origin;
  missionFocus.textContent = song.listeningPoint;
  missionInstruments.textContent = song.instruments.join(" · ");
  missionAudioStatus.textContent = "음원을 준비하고 있어요";
  previewButton.disabled = true;
  startButton.disabled = true;
  renderer.setSong(song);
  showScreen("mission");
  void audio.preload(song).then(() => {
    if (selectedSong.id !== song.id || screen !== "mission") return;
    missionAudioStatus.textContent = "고품질 음원 준비 완료";
    previewButton.disabled = false;
    startButton.disabled = false;
  }).catch((error) => {
    console.error(error);
    missionAudioStatus.textContent = "음원을 불러오지 못했습니다. 연결을 확인해 주세요.";
  });
}

async function previewSong(): Promise<void> {
  if (previewing) {
    audio.stop();
    window.clearTimeout(previewTimer);
    previewing = false;
    previewButton.innerHTML = `<i data-lucide="volume-2"></i><span>12초 미리 듣기</span>`;
    refreshIcons();
    return;
  }
  previewButton.disabled = true;
  missionAudioStatus.textContent = "미리 듣는 중";
  try {
    await audio.preview(selectedSong);
    previewing = true;
    previewButton.innerHTML = `<i data-lucide="pause"></i><span>미리 듣기 멈춤</span>`;
    previewTimer = window.setTimeout(() => {
      if (!previewing || screen !== "mission") return;
      previewing = false;
      previewButton.innerHTML = `<i data-lucide="volume-2"></i><span>다시 미리 듣기</span>`;
      missionAudioStatus.textContent = "고품질 음원 준비 완료";
      refreshIcons();
    }, 12200);
  } catch (error) {
    console.error(error);
    missionAudioStatus.textContent = "소리 재생을 허용한 뒤 다시 시도해 주세요.";
  } finally {
    previewButton.disabled = false;
    refreshIcons();
  }
}

function prepareGameChrome(song: Song): void {
  hudTitle.textContent = song.title;
  hudNumber.textContent = song.number;
  sectionLabel.textContent = "준비";
  scoreValue.textContent = "0";
  comboValue.textContent = "0";
  gameProgress.style.width = "0%";
  judgeText.textContent = "";
  mvSongTitle.textContent = song.title;
  mvSongMeta.textContent = `${song.featuredInstrument} · ${song.bpm} BPM · ${song.beatsPerBar}박`;
  beatDots.innerHTML = Array.from({ length: song.beatsPerBar }, () => "<span></span>").join("");
  lastScene = null;
  lastBeatDot = -1;
  rotatePaused = false;
  pauseButton.innerHTML = `<i data-lucide="pause"></i>`;
  pauseButton.ariaLabel = "일시정지";
}

async function startSelectedSong(): Promise<void> {
  startButton.disabled = true;
  previewButton.disabled = true;
  startButton.innerHTML = `<span>음원 준비 중</span>`;
  audio.stop();
  window.clearTimeout(previewTimer);
  previewing = false;
  renderer.clearEffects();
  skiaEffects.clear();
  activePointers.clear();
  activeKeys.clear();
  renderer.setSong(selectedSong);
  timeline = new VisualTimeline(selectedSong);
  mv.setSong(selectedSong);
  prepareGameChrome(selectedSong);
  try {
    showScreen("game");
    mv.initialize();
    syncGameLayout();
    await game.start(selectedSong);
    // CanvasKit is only fetched once a game is actually running.
    if (profile.skia) void skiaEffects.initialize().then(() => { syncEffectOwnership(); syncGameLayout(); });
    requestAnimationFrame(syncGameLayout);
    showFeedback("짧은 바는 톡, 긴 바는 꾹!", "hint");
    if (viewportLayout.mode === "rotate") void pauseForRotation();
  } catch (error) {
    console.error(error);
    showScreen("mission");
    missionAudioStatus.textContent = "음원을 시작하지 못했습니다. 다시 시도해 주세요.";
  } finally {
    startButton.disabled = false;
    startButton.innerHTML = `<span>연주 시작</span><i data-lucide="play"></i>`;
    previewButton.disabled = false;
    refreshIcons();
  }
}

/** Positions the 9:16 stage with integer CSS pixels (no transform scaling) and resizes every layer. */
function syncGameLayout(): void {
  const rect = gameScreen.getBoundingClientRect();
  viewportLayout = computeViewportLayout(rect.width || window.innerWidth, rect.height || window.innerHeight);
  const { stage, mode } = viewportLayout;
  gameScreen.dataset.layout = mode;
  gameScreen.style.setProperty("--stage-w", `${stage.width}px`);
  stageFrame.style.left = `${stage.x}px`;
  stageFrame.style.top = `${stage.y}px`;
  stageFrame.style.width = `${stage.width}px`;
  stageFrame.style.height = `${stage.height}px`;
  const hudHeight = gameHud.offsetHeight + progressTrack.offsetHeight + sectionLabel.offsetHeight;
  renderer.setLayout(stage.width, stage.height, hudHeight, profile.stageDpr);
  skiaEffects.setLayout(renderer.currentLayout, profile.stageDpr);
  mv.setLayout(viewportLayout, profile);
  rotateNotice.hidden = mode !== "rotate";
  if (mode === "rotate") void pauseForRotation();
  if (lastSnapshot) renderAll(lastSnapshot);
}

async function pauseForRotation(): Promise<void> {
  if (screen !== "game" || !lastSnapshot || lastSnapshot.paused || rotatePaused) return;
  rotatePaused = true;
  await setPaused(true);
}

function renderAll(snapshot: GameSnapshot): void {
  renderer.render({
    songTime: snapshot.songTime,
    notes: snapshot.notes,
    section: snapshot.section,
    lanePulse: snapshot.lanePulse,
    progress: snapshot.progress,
    paused: snapshot.paused,
    focusHint: snapshot.section.mode === "listen",
  });
  if (profile.skia && skiaEffects.active) skiaEffects.render(snapshot);
  if (timeline) {
    const frame = timeline.frameAt(snapshot.songTime);
    mv.render(frame, snapshot.paused);
    updateMvCaptions(frame);
  }
}

function updateMvCaptions(frame: VisualFrame): void {
  if (frame.scene !== lastScene) {
    lastScene = frame.scene;
    const order = SCENE_ORDER.indexOf(frame.scene);
    mvSceneIndex.textContent = `${String(order + 1).padStart(2, "0")} / 05`;
    mvSceneName.textContent = SCENE_LABELS[frame.scene].title;
    mvSceneHint.textContent = SCENE_LABELS[frame.scene].hint;
    sceneSteps.forEach((step) => step.classList.toggle("active", step.dataset.scene === frame.scene));
    gameScreen.dataset.scene = frame.scene;
  }
  const dot = Math.floor(frame.barPhase * (selectedSong.beatsPerBar));
  if (dot !== lastBeatDot && frame.beat >= 0) {
    lastBeatDot = dot;
    [...beatDots.children].forEach((child, index) => child.classList.toggle("on", index === dot));
    energyBar.style.transform = `scaleX(${(0.08 + frame.energy * 0.92).toFixed(3)})`;
  }
}

function handleFrame(snapshot: GameSnapshot): void {
  lastSnapshot = snapshot;
  renderAll(snapshot);
  if (performance.now() - lastHudUpdate > 70) {
    lastHudUpdate = performance.now();
    scoreValue.textContent = snapshot.score.toLocaleString("ko-KR");
    comboValue.textContent = String(snapshot.combo);
    gameProgress.style.width = `${snapshot.progress * 100}%`;
  }
}

function handleJudge(event: JudgeEvent): void {
  if (event.judge === "MISS") {
    comboValue.textContent = "0";
    return;
  }
  scoreValue.textContent = event.score.toLocaleString("ko-KR");
  comboValue.textContent = String(event.combo);
  activePointers.forEach((noteId, pointerId) => {
    if (noteId !== event.noteId) return;
    activePointers.delete(pointerId);
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  });
  renderer.pop(event.noteId, event.lane);
  skiaEffects.burst(event.lane);
  const message = event.combo > 0 && event.combo % 10 === 0 ? `${event.combo} COMBO` : event.judge;
  showFeedback(message, event.judge.toLowerCase());
}

function showFeedback(message: string, kind: string): void {
  window.clearTimeout(feedbackTimer);
  judgeText.className = `judge-text show ${kind}`;
  judgeText.textContent = message;
  feedbackTimer = window.setTimeout(() => judgeText.classList.remove("show"), kind === "hint" ? 1200 : 620);
}

function handleSection(section: SongSection): void {
  sectionLabel.textContent = section.label;
  sectionCallout.textContent = section.mode === "listen" ? `귀를 열어요 · ${section.label}` : section.label;
  sectionCallout.className = `section-callout show ${section.mode}`;
  window.clearTimeout(sectionTimer);
  sectionTimer = window.setTimeout(() => sectionCallout.classList.remove("show"), section.mode === "listen" ? 2200 : 1300);
}

function handleComplete(result: GameResult): void {
  latestResult = result;
  activePointers.clear();
  activeKeys.clear();
  audio.stop();
  const best = Math.max(getBest(result.songId), result.score);
  localStorage.setItem(bestScoreKey(result.songId), String(best));
  window.setTimeout(() => renderResult(result, best), 360);
}

function renderResult(result: GameResult, best: number): void {
  resultTitle.textContent = selectedSong.title;
  resultStars.innerHTML = [0, 1, 2].map((index) => `<span class="${index < result.stars ? "earned" : ""}">★</span>`).join("");
  resultBest.textContent = `BEST ${best.toLocaleString("ko-KR")}`;
  accuracyValue.textContent = `${result.accuracy}%`;
  maxComboValue.textContent = `${result.maxCombo}회`;
  resultScoreValue.textContent = result.score.toLocaleString("ko-KR");
  resultJudges.textContent = `PERFECT ${result.perfect} · GREAT ${result.great} · GOOD ${result.good} · MISS ${result.miss}`;
  questionTitle.textContent = selectedSong.mission.question;
  answerFeedback.textContent = "";
  earnedBadge.hidden = true;
  badgeName.textContent = selectedSong.mission.badge;
  answerOptions.innerHTML = selectedSong.mission.options.map((option, index) => `<button type="button" data-answer="${index}"><span>${index + 1}</span>${option}</button>`).join("");
  answerOptions.querySelectorAll<HTMLButtonElement>("button").forEach((button) => button.addEventListener("click", () => checkAnswer(button)));
  lastSnapshot = null;
  showScreen("result");
}

function checkAnswer(button: HTMLButtonElement): void {
  const answer = Number(button.dataset.answer);
  answerOptions.querySelectorAll("button").forEach((item) => item.classList.remove("wrong", "correct"));
  if (answer === selectedSong.mission.answerIndex) {
    button.classList.add("correct");
    answerFeedback.textContent = "잘 들었어요. 음악의 표지를 찾았습니다!";
    answerFeedback.className = "answer-feedback success";
    earnedBadge.hidden = false;
    audio.playUi("success");
    answerOptions.querySelectorAll<HTMLButtonElement>("button").forEach((item) => { item.disabled = true; });
    localStorage.setItem(`mumu-music-v4-badge-${selectedSong.id}`, "earned");
  } else {
    button.classList.add("wrong");
    answerFeedback.textContent = selectedSong.mission.hint;
    answerFeedback.className = "answer-feedback hint";
    audio.playUi("soft");
  }
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && screen === "game") {
    event.preventDefault();
    void togglePause();
    return;
  }
  if (screen !== "game" || event.repeat || lastSnapshot?.paused) return;
  const lane = ({ KeyA: 0, KeyS: 1, KeyD: 2, KeyJ: 3, KeyK: 4 } as Record<string, number>)[event.code];
  if (lane === undefined) return;
  event.preventDefault();
  const result = game.pressLane(lane, event.timeStamp);
  if (result?.kind === "holding") {
    activeKeys.set(event.code, result.noteId);
    showFeedback("HOLD", "hold");
  }
});

window.addEventListener("keyup", (event) => {
  const noteId = activeKeys.get(event.code);
  if (!noteId) return;
  event.preventDefault();
  activeKeys.delete(event.code);
  const releasedEarly = game.releaseNote(noteId, event.timeStamp);
  if (releasedEarly) showFeedback("다시 이어 눌러요", "hint");
});

canvas.addEventListener("pointerdown", (event) => {
  if (screen !== "game" || lastSnapshot?.paused) return;
  event.preventDefault();
  const noteId = renderer.hitTest(event.clientX, event.clientY);
  if (!noteId) return;
  const result = game.pressNote(noteId, event.timeStamp);
  if (result?.kind !== "holding") return;
  activePointers.set(event.pointerId, result.noteId);
  showFeedback("누르는 중", "hold");
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic test events do not own an active browser pointer.
  }
});

const releasePointer = (event: PointerEvent): void => {
  const noteId = activePointers.get(event.pointerId);
  if (!noteId) return;
  event.preventDefault();
  activePointers.delete(event.pointerId);
  const releasedEarly = game.releaseNote(noteId, event.timeStamp);
  if (releasedEarly) showFeedback("다시 이어 눌러요", "hint");
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
};

canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

async function setPaused(paused: boolean): Promise<void> {
  if (!lastSnapshot || lastSnapshot.paused === paused) return;
  await togglePause();
}

async function togglePause(): Promise<void> {
  if (!lastSnapshot) return;
  // Resuming is blocked while a short landscape phone shows the rotate notice.
  if (lastSnapshot.paused && viewportLayout.mode === "rotate") return;
  const paused = await game.togglePause();
  if (!paused) rotatePaused = false;
  pauseButton.innerHTML = `<i data-lucide="${paused ? "play" : "pause"}"></i>`;
  pauseButton.ariaLabel = paused ? "계속하기" : "일시정지";
  refreshIcons();
  lastSnapshot = { ...lastSnapshot, paused };
  renderAll(lastSnapshot);
}

document.querySelectorAll<HTMLButtonElement>(".settings-open").forEach((button) => {
  button.addEventListener("click", async () => {
    await audio.ensureReady();
    latencyInfo.textContent = `이 기기의 출력 지연 약 ${Math.round(audio.outputLatencyMs)} ms`;
    settingsDialog.showModal();
  });
});
volumeInput.addEventListener("input", () => {
  const value = Number(volumeInput.value);
  volumeValue.textContent = `${value}%`;
  localStorage.setItem("mumu-music-v4-volume", String(value));
  audio.setMasterVolume(value / 100);
});
timingInput.addEventListener("input", () => {
  const value = Number(timingInput.value);
  timingValue.textContent = `${value > 0 ? "+" : ""}${value} ms`;
  localStorage.setItem("mumu-music-v5-offset-ms", String(value));
});
qualityInput.addEventListener("change", () => {
  qualitySetting = parseQualitySetting(qualityInput.value);
  localStorage.setItem(QUALITY_KEY, qualitySetting);
  qualityValue.textContent = QUALITY_LABELS[qualitySetting];
  applyProfile();
  if (screen === "game" && profile.skia) void skiaEffects.initialize().then(() => { syncEffectOwnership(); syncGameLayout(); });
});
select<HTMLButtonElement>("#resetRecords").addEventListener("click", () => {
  Object.keys(localStorage).filter((key) => key.startsWith("mumu-music-")).forEach((key) => localStorage.removeItem(key));
  volumeInput.value = "88";
  volumeValue.textContent = "88%";
  audio.setMasterVolume(0.88);
  timingInput.value = "0";
  timingValue.textContent = "0 ms";
  qualitySetting = "auto";
  qualityInput.value = "auto";
  qualityValue.textContent = QUALITY_LABELS.auto;
  applyProfile();
  audio.playUi("soft");
});

select<HTMLButtonElement>("#songPrev").addEventListener("click", () => songGrid.scrollBy({ left: -songGrid.clientWidth * 0.7, behavior: "smooth" }));
select<HTMLButtonElement>("#songNext").addEventListener("click", () => songGrid.scrollBy({ left: songGrid.clientWidth * 0.7, behavior: "smooth" }));
select<HTMLButtonElement>("#missionBack").addEventListener("click", () => { audio.stop(); window.clearTimeout(previewTimer); previewing = false; showScreen("library"); });
previewButton.addEventListener("click", () => { void previewSong(); });
startButton.addEventListener("click", () => { void startSelectedSong(); });
pauseButton.addEventListener("click", () => { void togglePause(); });
select<HTMLButtonElement>("#libraryButton").addEventListener("click", () => { game.stop(); lastSnapshot = null; showScreen("library"); });
select<HTMLButtonElement>("#retryButton").addEventListener("click", () => { if (latestResult) void startSelectedSong(); });

document.querySelectorAll<HTMLAnchorElement>(".brand").forEach((brand) => {
  brand.addEventListener("click", (event) => { event.preventDefault(); game.stop(); lastSnapshot = null; showScreen("library"); });
});

let resizeFrame = 0;
function scheduleResize(): void {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (screen === "game") syncGameLayout();
    else if (screen === "library") drawLibraryArt();
    else if (screen === "mission") drawSongArt(missionArt, selectedSong, "hero");
    else if (screen === "result") drawSongArt(resultArt, selectedSong, "hero");
  });
}
window.addEventListener("resize", scheduleResize);
window.addEventListener("orientationchange", scheduleResize);
new ResizeObserver(scheduleResize).observe(gameScreen);
motionQuery.addEventListener("change", applyProfile);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "game" && lastSnapshot && !lastSnapshot.paused) void togglePause();
});

const storedVolumeValue = localStorage.getItem("mumu-music-v4-volume");
const storedVolume = storedVolumeValue === null ? 88 : Number(storedVolumeValue);
volumeInput.value = String(storedVolume);
volumeValue.textContent = `${storedVolume}%`;
audio.setMasterVolume(storedVolume / 100);
const storedTiming = Number(localStorage.getItem("mumu-music-v5-offset-ms") ?? "0");
timingInput.value = String(storedTiming);
timingValue.textContent = `${storedTiming > 0 ? "+" : ""}${storedTiming} ms`;
qualityInput.value = qualitySetting;
qualityValue.textContent = QUALITY_LABELS[qualitySetting];
applyProfile();
renderLibrary();
applySongPalette(selectedSong);
refreshIcons();
