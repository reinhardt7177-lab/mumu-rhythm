import "./styles.css";
import { songs, songDurationSeconds } from "./content/songs";
import { AudioEngine } from "./engine/audio";
import { RhythmGame, type GameSnapshot, type JudgeEvent } from "./engine/game";
import { StageRenderer } from "./engine/renderer";
import type { GameResult, ScreenName, Song, SongSection } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("앱을 시작할 수 없습니다.");

app.innerHTML = `
  <main class="app-shell" data-screen="library">
    <section id="libraryScreen" class="screen library-screen" aria-labelledby="libraryTitle">
      <header class="topbar">
        <a class="brand" href="#" aria-label="MUMU 음악 탐험대 처음 화면">
          <span class="brand-mark" aria-hidden="true">♪</span>
          <span><strong>MUMU</strong><small>음악 탐험대</small></span>
        </a>
        <button class="icon-button settings-open" type="button" aria-label="소리 맞춤" title="소리 맞춤">⚙</button>
      </header>

      <div class="library-heading">
        <p class="eyebrow">오늘의 감상 활동</p>
        <h1 id="libraryTitle">귀로 찾고, 손으로 연주해요</h1>
        <p>한 곡을 골라 가락 속에 숨은 음악 표지를 찾아보세요.</p>
      </div>

      <div id="songGrid" class="song-grid" aria-label="곡 선택"></div>

      <footer class="library-footer">
        <span>3곡</span>
        <span>약 3분</span>
        <span>키보드 · 터치</span>
      </footer>
    </section>

    <section id="missionScreen" class="screen mission-screen" hidden aria-labelledby="missionSongTitle">
      <img id="missionArtwork" class="screen-art" alt="" />
      <div class="screen-shade"></div>
      <header class="overlay-topbar">
        <button id="missionBack" class="icon-button light" type="button" aria-label="곡 선택으로 돌아가기" title="뒤로">←</button>
        <span id="missionTrackMeta" class="track-meta"></span>
        <button class="icon-button light settings-open" type="button" aria-label="소리 맞춤" title="소리 맞춤">⚙</button>
      </header>

      <div class="mission-copy">
        <p id="missionEyebrow" class="eyebrow light-text"></p>
        <h2 id="missionSongTitle"></h2>
        <p id="missionSubtitle" class="song-subtitle"></p>
        <div class="mission-rule" aria-hidden="true"></div>
        <h3 id="missionTitle"></h3>
        <p id="missionDescription"></p>
      </div>

      <div class="mission-dock">
        <button id="previewButton" class="secondary-button" type="button">
          <span aria-hidden="true">▶</span> 미리 듣기
        </button>
        <div class="lane-preview" aria-label="낮은음에서 높은음까지 다섯 레인">
          <span>A</span><span>S</span><span>D</span><span>J</span><span>K</span>
        </div>
        <button id="startButton" class="primary-button" type="button">
          탐험 시작 <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>

    <section id="gameScreen" class="screen game-screen" hidden aria-label="리듬 연주 화면">
      <canvas id="stage" aria-label="다섯 레인 리듬 스테이지"></canvas>
      <header class="game-hud">
        <div class="hud-brand"><span>♪</span><strong id="hudTitle"></strong></div>
        <div class="section-status">
          <small>지금 듣는 곳</small>
          <strong id="sectionLabel">준비</strong>
        </div>
        <div class="score-status">
          <span><small>점수</small><strong id="scoreValue">0</strong></span>
          <span><small>이어 연주</small><strong id="comboValue">0</strong></span>
        </div>
        <button id="pauseButton" class="icon-button game-control" type="button" aria-label="일시정지" title="일시정지">Ⅱ</button>
      </header>

      <div class="progress-track" aria-hidden="true"><span id="gameProgress"></span></div>
      <div id="sectionCallout" class="section-callout" aria-live="polite"></div>
      <div id="judgeText" class="judge-text" aria-live="polite"></div>

      <div id="keybar" class="keybar" aria-label="연주 패드">
        <button type="button" data-lane="0"><span>A</span><small>낮은음</small></button>
        <button type="button" data-lane="1"><span>S</span><small>↗</small></button>
        <button type="button" data-lane="2"><span>D</span><small>가운데</small></button>
        <button type="button" data-lane="3"><span>J</span><small>↗</small></button>
        <button type="button" data-lane="4"><span>K</span><small>높은음</small></button>
      </div>
    </section>

    <section id="resultScreen" class="screen result-screen" hidden aria-labelledby="resultTitle">
      <img id="resultArtwork" class="screen-art" alt="" />
      <div class="screen-shade result-shade"></div>
      <header class="overlay-topbar">
        <a class="brand brand-light" href="#" aria-label="MUMU 음악 탐험대 처음 화면">
          <span class="brand-mark" aria-hidden="true">♪</span>
          <span><strong>MUMU</strong><small>음악 탐험대</small></span>
        </a>
        <span id="resultBest" class="track-meta"></span>
      </header>

      <div class="result-layout">
        <section class="result-summary">
          <p class="eyebrow light-text">연주를 마쳤어요</p>
          <h2 id="resultTitle"></h2>
          <div id="resultStars" class="result-stars" aria-label="리듬 별"></div>
          <div class="result-metrics">
            <span><small>리듬 정확도</small><strong id="accuracyValue"></strong></span>
            <span><small>최고 이어 연주</small><strong id="maxComboValue"></strong></span>
            <span><small>점수</small><strong id="resultScoreValue"></strong></span>
          </div>
        </section>

        <section class="listening-check" aria-labelledby="questionTitle">
          <p class="eyebrow">귀 미션 확인</p>
          <h3 id="questionTitle"></h3>
          <div id="answerOptions" class="answer-options"></div>
          <p id="answerFeedback" class="answer-feedback" aria-live="polite"></p>
          <div id="earnedBadge" class="earned-badge" hidden>
            <span aria-hidden="true">★</span>
            <div><small>새 감상 배지</small><strong id="badgeName"></strong></div>
          </div>
        </section>
      </div>

      <div class="result-actions">
        <button id="libraryButton" class="secondary-button light-action" type="button">다른 곡</button>
        <button id="retryButton" class="primary-button" type="button">한 번 더 <span aria-hidden="true">↻</span></button>
      </div>
    </section>

    <dialog id="settingsDialog" class="settings-dialog">
      <form method="dialog">
        <header>
          <div><p class="eyebrow">교실 소리 맞춤</p><h2>타이밍 조절</h2></div>
          <button class="icon-button" value="close" aria-label="닫기" title="닫기">×</button>
        </header>
        <p>소리가 늦게 들리는 기기에서는 값을 오른쪽으로 옮겨요.</p>
        <label class="offset-control">
          <span>판정 보정 <strong id="offsetValue">0ms</strong></span>
          <input id="offsetInput" type="range" min="-180" max="180" step="10" value="0" />
        </label>
        <button id="resetRecords" class="text-button" type="button">이 기기의 기록 초기화</button>
      </form>
    </dialog>
  </main>
`;

const select = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`화면 요소를 찾을 수 없습니다: ${selector}`);
  return element;
};

const shell = select<HTMLElement>(".app-shell");
const songGrid = select<HTMLDivElement>("#songGrid");
const missionArtwork = select<HTMLImageElement>("#missionArtwork");
const missionTrackMeta = select<HTMLElement>("#missionTrackMeta");
const missionEyebrow = select<HTMLElement>("#missionEyebrow");
const missionSongTitle = select<HTMLElement>("#missionSongTitle");
const missionSubtitle = select<HTMLElement>("#missionSubtitle");
const missionTitle = select<HTMLElement>("#missionTitle");
const missionDescription = select<HTMLElement>("#missionDescription");
const previewButton = select<HTMLButtonElement>("#previewButton");
const startButton = select<HTMLButtonElement>("#startButton");
const resultArtwork = select<HTMLImageElement>("#resultArtwork");
const resultTitle = select<HTMLElement>("#resultTitle");
const resultStars = select<HTMLElement>("#resultStars");
const resultBest = select<HTMLElement>("#resultBest");
const accuracyValue = select<HTMLElement>("#accuracyValue");
const maxComboValue = select<HTMLElement>("#maxComboValue");
const resultScoreValue = select<HTMLElement>("#resultScoreValue");
const questionTitle = select<HTMLElement>("#questionTitle");
const answerOptions = select<HTMLElement>("#answerOptions");
const answerFeedback = select<HTMLElement>("#answerFeedback");
const earnedBadge = select<HTMLElement>("#earnedBadge");
const badgeName = select<HTMLElement>("#badgeName");
const settingsDialog = select<HTMLDialogElement>("#settingsDialog");
const offsetInput = select<HTMLInputElement>("#offsetInput");
const offsetValue = select<HTMLElement>("#offsetValue");
const canvas = select<HTMLCanvasElement>("#stage");
const scoreValue = select<HTMLElement>("#scoreValue");
const comboValue = select<HTMLElement>("#comboValue");
const hudTitle = select<HTMLElement>("#hudTitle");
const sectionLabel = select<HTMLElement>("#sectionLabel");
const gameProgress = select<HTMLElement>("#gameProgress");
const sectionCallout = select<HTMLElement>("#sectionCallout");
const judgeText = select<HTMLElement>("#judgeText");
const pauseButton = select<HTMLButtonElement>("#pauseButton");
const keyButtons = [...document.querySelectorAll<HTMLButtonElement>("#keybar button")];

const screenElements: Record<ScreenName, HTMLElement> = {
  library: select("#libraryScreen"),
  mission: select("#missionScreen"),
  game: select("#gameScreen"),
  result: select("#resultScreen"),
};

const audio = new AudioEngine();
let selectedSong: Song = songs[0];
let latestResult: GameResult | null = null;
let screen: ScreenName = "library";
let previewTimer = 0;
let feedbackTimer = 0;
let sectionTimer = 0;
let lastHudUpdate = 0;
let lastSnapshot: GameSnapshot | null = null;

const renderer = new StageRenderer(canvas, selectedSong);
const game = new RhythmGame(audio, {
  onFrame: handleFrame,
  onJudge: handleJudge,
  onFeedback: (message) => showFeedback(message, "hint"),
  onSection: handleSection,
  onComplete: handleComplete,
});

function formatTime(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function bestScoreKey(songId: string): string {
  return `mumu-music-v2-best-${songId}`;
}

function getBest(songId: string): number {
  return Number(localStorage.getItem(bestScoreKey(songId))) || 0;
}

function showScreen(next: ScreenName): void {
  screen = next;
  shell.dataset.screen = next;
  Object.entries(screenElements).forEach(([name, element]) => {
    element.hidden = name !== next;
  });
  window.scrollTo(0, 0);
}

function renderLibrary(): void {
  songGrid.innerHTML = songs.map((song, index) => {
    const duration = formatTime(songDurationSeconds(song));
    return `
      <button class="song-card" type="button" data-song-index="${index}" style="--song-accent:${song.palette.accent}; --song-deep:${song.palette.deep}">
        <span class="song-art-wrap">
          <img src="${song.artwork}" alt="" loading="${index === 0 ? "eager" : "lazy"}" />
          <span class="song-number">0${index + 1}</span>
          <span class="play-mark" aria-hidden="true">▶</span>
        </span>
        <span class="song-card-copy">
          <small>${song.mission.eyebrow}</small>
          <strong>${song.title}</strong>
          <span>${song.subtitle}</span>
          <em><span>${song.difficulty}</span><span>${song.beatsPerBar}박</span><span>${duration}</span></em>
        </span>
      </button>
    `;
  }).join("");

  songGrid.querySelectorAll<HTMLButtonElement>(".song-card").forEach((card) => {
    card.addEventListener("click", () => {
      const index = Number(card.dataset.songIndex);
      openMission(songs[index]);
    });
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
  missionArtwork.src = song.artwork;
  missionArtwork.alt = `${song.title} 감상 배경`;
  missionTrackMeta.textContent = `${song.beatsPerBar}박 · ${song.bpm} BPM · ${formatTime(songDurationSeconds(song))}`;
  missionEyebrow.textContent = song.mission.eyebrow;
  missionSongTitle.textContent = song.title;
  missionSubtitle.textContent = song.subtitle;
  missionTitle.textContent = song.mission.title;
  missionDescription.textContent = song.mission.description;
  previewButton.innerHTML = `<span aria-hidden="true">▶</span> 미리 듣기`;
  previewButton.disabled = false;
  renderer.setSong(song);
  audio.playUi("select");
  showScreen("mission");
}

async function previewSong(): Promise<void> {
  previewButton.disabled = true;
  previewButton.innerHTML = `<span class="listening-dot" aria-hidden="true"></span> 듣는 중`;
  try {
    await audio.preview(selectedSong);
  } catch (error) {
    console.error("악기 미리 듣기 재생에 실패했습니다.", error);
    previewButton.textContent = "소리를 확인해 주세요";
    window.setTimeout(() => {
      previewButton.disabled = false;
      previewButton.innerHTML = `<span aria-hidden="true">▶</span> 다시 시도`;
    }, 1200);
    return;
  }
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    previewButton.disabled = false;
    previewButton.innerHTML = `<span aria-hidden="true">▶</span> 다시 듣기`;
  }, Math.min(11000, (60 / selectedSong.bpm) * 16 * 1000));
}

async function startSelectedSong(): Promise<void> {
  startButton.disabled = true;
  previewButton.disabled = true;
  audio.stop();
  renderer.clearEffects();
  renderer.setSong(selectedSong);
  hudTitle.textContent = selectedSong.title;
  sectionLabel.textContent = "준비";
  scoreValue.textContent = "0";
  comboValue.textContent = "0";
  gameProgress.style.width = "0%";
  judgeText.textContent = "";
  showScreen("game");
  renderer.resize();
  try {
    await game.start(selectedSong);
  } catch {
    showScreen("mission");
    previewButton.disabled = false;
    showFeedback("브라우저의 소리 재생을 확인해 주세요", "hint");
  } finally {
    startButton.disabled = false;
  }
}

function handleFrame(snapshot: GameSnapshot): void {
  lastSnapshot = snapshot;
  renderer.render({
    songTime: snapshot.songTime,
    notes: snapshot.notes,
    section: snapshot.section,
    lanePulse: snapshot.lanePulse,
    progress: snapshot.progress,
    paused: snapshot.paused,
    focusHint: snapshot.section.mode === "listen",
  });
  if (performance.now() - lastHudUpdate > 70) {
    lastHudUpdate = performance.now();
    scoreValue.textContent = snapshot.score.toLocaleString("ko-KR");
    comboValue.textContent = String(snapshot.combo);
    gameProgress.style.width = `${snapshot.progress * 100}%`;
  }
}

function handleJudge(event: JudgeEvent): void {
  const button = keyButtons[event.lane];
  button.classList.remove("is-hit");
  void button.offsetWidth;
  button.classList.add("is-hit");
  window.setTimeout(() => button.classList.remove("is-hit"), 120);

  if (event.judge === "MISS") {
    showFeedback("다음 박을 들어요", "miss");
    return;
  }
  renderer.hit(event.lane, event.judge === "PERFECT" ? 1 : 0.65);
  showFeedback(event.judge, event.judge.toLowerCase());
}

function showFeedback(message: string, kind: string): void {
  window.clearTimeout(feedbackTimer);
  judgeText.className = `judge-text show ${kind}`;
  judgeText.textContent = message;
  feedbackTimer = window.setTimeout(() => {
    judgeText.classList.remove("show");
  }, kind === "hint" ? 1200 : 620);
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
  audio.stop();
  const previousBest = getBest(result.songId);
  const best = Math.max(previousBest, result.score);
  localStorage.setItem(bestScoreKey(result.songId), String(best));
  window.setTimeout(() => renderResult(result, best), 420);
}

function renderResult(result: GameResult, best: number): void {
  resultArtwork.src = selectedSong.artwork;
  resultArtwork.alt = `${selectedSong.title} 감상 배경`;
  resultTitle.textContent = selectedSong.title;
  resultStars.innerHTML = [0, 1, 2].map((index) => `<span class="${index < result.stars ? "earned" : ""}">★</span>`).join("");
  resultBest.textContent = `최고 기록 ${best.toLocaleString("ko-KR")}`;
  accuracyValue.textContent = `${result.accuracy}%`;
  maxComboValue.textContent = `${result.maxCombo}회`;
  resultScoreValue.textContent = result.score.toLocaleString("ko-KR");
  questionTitle.textContent = selectedSong.mission.question;
  answerFeedback.textContent = "";
  earnedBadge.hidden = true;
  badgeName.textContent = selectedSong.mission.badge;
  answerOptions.innerHTML = selectedSong.mission.options.map((option, index) => (
    `<button type="button" data-answer="${index}"><span>${index + 1}</span>${option}</button>`
  )).join("");
  answerOptions.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.addEventListener("click", () => checkAnswer(button));
  });
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
    localStorage.setItem(`mumu-music-v2-badge-${selectedSong.id}`, "earned");
  } else {
    button.classList.add("wrong");
    answerFeedback.textContent = selectedSong.mission.hint;
    answerFeedback.className = "answer-feedback hint";
    audio.playUi("soft");
  }
}

function pressLane(lane: number): void {
  game.laneDown(lane);
}

function releaseLane(lane: number): void {
  game.laneUp(lane);
}

const keyMap = new Map([
  ["KeyA", 0],
  ["KeyS", 1],
  ["KeyD", 2],
  ["KeyJ", 3],
  ["KeyK", 4],
]);

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && screen === "game") {
    event.preventDefault();
    void togglePause();
    return;
  }
  const lane = keyMap.get(event.code);
  if (lane === undefined || event.repeat || screen !== "game") return;
  event.preventDefault();
  keyButtons[lane].classList.add("pressed");
  pressLane(lane);
});

window.addEventListener("keyup", (event) => {
  const lane = keyMap.get(event.code);
  if (lane === undefined) return;
  keyButtons[lane].classList.remove("pressed");
  releaseLane(lane);
});

keyButtons.forEach((button, lane) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.classList.add("pressed");
    pressLane(lane);
  });
  const release = (event: PointerEvent): void => {
    event.preventDefault();
    button.classList.remove("pressed");
    releaseLane(lane);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
});

async function togglePause(): Promise<void> {
  const paused = await game.togglePause();
  pauseButton.textContent = paused ? "▶" : "Ⅱ";
  pauseButton.ariaLabel = paused ? "계속하기" : "일시정지";
  if (lastSnapshot) {
    renderer.render({
      songTime: lastSnapshot.songTime,
      notes: lastSnapshot.notes,
      section: lastSnapshot.section,
      lanePulse: lastSnapshot.lanePulse,
      progress: lastSnapshot.progress,
      paused,
      focusHint: lastSnapshot.section.mode === "listen",
    });
  }
}

document.querySelectorAll<HTMLButtonElement>(".settings-open").forEach((button) => {
  button.addEventListener("click", async () => {
    await audio.ensureReady();
    settingsDialog.showModal();
  });
});

offsetInput.addEventListener("input", () => {
  const value = Number(offsetInput.value);
  offsetValue.textContent = `${value > 0 ? "+" : ""}${value}ms`;
  localStorage.setItem("mumu-music-v2-offset", String(value));
  game.setTimingOffset(value);
});

select<HTMLButtonElement>("#resetRecords").addEventListener("click", () => {
  Object.keys(localStorage).filter((key) => key.startsWith("mumu-music-v2-")).forEach((key) => localStorage.removeItem(key));
  offsetInput.value = "0";
  offsetValue.textContent = "0ms";
  game.setTimingOffset(0);
  audio.playUi("soft");
});

select<HTMLButtonElement>("#missionBack").addEventListener("click", () => {
  audio.stop();
  showScreen("library");
});
previewButton.addEventListener("click", () => { void previewSong(); });
startButton.addEventListener("click", () => { void startSelectedSong(); });
pauseButton.addEventListener("click", () => { void togglePause(); });
select<HTMLButtonElement>("#libraryButton").addEventListener("click", () => {
  game.stop();
  showScreen("library");
});
select<HTMLButtonElement>("#retryButton").addEventListener("click", () => {
  if (latestResult) void startSelectedSong();
});

document.querySelectorAll<HTMLAnchorElement>(".brand").forEach((brand) => {
  brand.addEventListener("click", (event) => {
    event.preventDefault();
    game.stop();
    showScreen("library");
  });
});

window.addEventListener("resize", () => renderer.resize());
document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "game" && lastSnapshot && !lastSnapshot.paused) void togglePause();
});

const storedOffset = Number(localStorage.getItem("mumu-music-v2-offset")) || 0;
offsetInput.value = String(storedOffset);
offsetValue.textContent = `${storedOffset > 0 ? "+" : ""}${storedOffset}ms`;
game.setTimingOffset(storedOffset);
renderLibrary();
applySongPalette(selectedSong);
