import { WORLDS } from './worlds';
import { MAX_ENERGY } from './combat';

const icon=(name:string)=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
export function renderApp() {
  return `<main class="quest" data-screen="library">
  <header class="top"><a class="logo" href="/" aria-label="음표 기사단 홈">M<span>♪</span>MU</a><span class="chapter" id="headerChapter"></span><div class="top-actions"><button class="icon" id="home" title="곡 선택" aria-label="곡 선택">${icon('layout-grid')}</button><button class="icon" id="pause" title="일시정지" aria-label="일시정지">${icon('pause')}</button><button class="icon" id="notebook" title="음악 수첩" aria-label="음악 수첩">${icon('book-open')}</button><button class="icon" id="fullscreen" title="전체화면" aria-label="전체화면">${icon('maximize')}</button><button class="icon" id="credits" title="음원·에셋 출처" aria-label="음원·에셋 출처">${icon('info')}</button></div></header>

  <section id="library" class="library" aria-label="세계와 곡 선택">
    <div class="world-preview">
      <img id="worldArt" class="world-art" alt="">
      <div class="travel-bard" aria-hidden="true"></div><div class="travel-enemy" aria-hidden="true"></div>
      <canvas id="stagePreview" class="stage-preview" aria-hidden="true"></canvas>
      <div class="world-caption"><h1>음표 기사단</h1><p id="worldTitle"></p></div>
      <button id="replayPreview" class="icon preview-replay" title="공연 다시 보기" aria-label="공연 다시 보기">${icon('rotate-ccw')}</button>
    </div>
    <aside class="selection-band" aria-label="음악 선택"><div class="selection-heading"><h2>음악</h2><span id="libraryCount"></span></div><div class="world-list" role="group" aria-label="세계 선택"><button id="allSongs" class="world-tab" aria-pressed="true">전체</button>${WORLDS.map(w=>`<button class="world-tab" data-world="${w.id}" aria-pressed="false">${w.era}</button>`).join('')}</div><div id="songList" class="song-list" aria-label="곡 목록"></div><div class="departure"><div class="selected-music"><div><strong id="selectedSong"></strong><span id="selectedMeta"></span></div></div><button id="openBriefing" class="primary">곡 소개 ${icon('arrow-right')}</button></div></aside>
  </section>

  <section class="arena" id="arena" hidden aria-label="리듬 모험">
    <section class="rhythm"><div class="panel-head"><b>리듬</b><span id="modeLabel">바를 터뜨려요</span></div><div class="score"><span>점수 <b id="score">0</b></span><span>콤보 <b id="combo">0</b></span></div><div class="track"><canvas id="notes" width="240" height="360" aria-label="5레인 리듬 스테이지"></canvas><span id="judge" aria-live="polite"></span></div><div class="keys">${['A','S','D','J','K'].map((k,i)=>`<button data-lane="${i}" aria-label="${k} 레인">${k}</button>`).join('')}</div><div class="songline"><span id="playingTitle"></span><span id="time">0:00</span></div><progress id="progress" max="1" value="0" aria-label="곡 진행"></progress></section>
    <section class="adventure"><div class="panel-head"><b id="location"></b><span id="stageCount">1 / 4</span></div>
      <div class="enemy battle-vitals">
        <div class="vital"><div class="vital-label"><span>아군 에너지</span><span id="energyLabel">${MAX_ENERGY} / ${MAX_ENERGY}</span></div><progress id="heroEnergy" value="${MAX_ENERGY}" max="${MAX_ENERGY}" aria-label="아군 에너지"></progress></div>
        <div class="vital"><div class="vital-label"><span id="enemyName"></span><span id="hpLabel"></span></div><progress id="enemyHp" value="180" max="180" aria-label="몬스터 체력"></progress></div>
        <small id="bossCue" aria-live="polite"></small>
      </div>
      <div class="battle-scene"><canvas id="world" aria-label="음표 기사와 몬스터의 픽셀 전투"></canvas></div><div class="dialog"><small id="chapterLabel"></small><p id="story"></p></div><div class="skillbar"><div><span>음악 마법</span><strong id="skill">8분음표 탄환</strong></div><div><span>되찾은 소리</span><strong id="kills">0 / 4</strong></div></div><div class="journey" id="journey"></div></section>
  </section>
  <footer><span id="footerWorld">네 개의 시대, 하나의 음악 모험</span><span>♪ MUMU Music Adventure</span></footer>

  <dialog id="briefing" aria-labelledby="briefTitle"><div class="brief-art" id="briefArt"><span id="briefEra"></span><button class="icon close-dialog" id="closeBriefing" title="닫기" aria-label="닫기">${icon('x')}</button></div><div class="modal-content"><p class="modal-kicker">오늘 만날 음악</p><h2 id="briefTitle"></h2><p class="composer" id="briefOrigin"></p><p class="introduction" id="briefIntroduction"></p><dl class="song-facts"><div><dt>주요 악기</dt><dd id="briefInstruments"></dd></div><div><dt>연주 시간</dt><dd id="briefDuration"></dd></div></dl><section class="listening-focus"><h3>${icon('headphones')} 귀 기울여요</h3><p id="briefFocus"></p></section><div class="choice grade-choice" role="group" aria-label="음악 학습 학년군"><button data-grade="3-4" aria-pressed="true">3~4학년 · 기초</button><button data-grade="5-6" aria-pressed="false">5~6학년 · 응용</button></div><details class="concept-notes"><summary>이번 곡의 음악 요소</summary><dl id="briefConcepts"></dl></details><div id="chartLevels" class="choice chart-levels" role="group" aria-label="연주 난이도" hidden><button data-chart-level="pulse" aria-pressed="true"><span>초급</span><small>첫 박</small></button><button data-chart-level="groove" aria-pressed="false"><span>중급</span><small>반주</small></button><button data-chart-level="melody" aria-pressed="false"><span>고급</span><small>가락·리듬</small></button></div><div class="choice" role="group" aria-label="플레이 방식"><button data-mode="explore" aria-pressed="true">바 터뜨리기</button><button data-mode="challenge" aria-pressed="false">박 맞추기</button></div></div><div class="brief-actions"><button id="start" class="primary wide">연주 시작 ${icon('play')}</button><p id="loading" class="loading" aria-live="polite"></p></div></dialog>
  <dialog id="paused" aria-labelledby="pauseTitle"><div class="modal-content"><p class="modal-kicker">잠깐의 쉼표</p><h2 id="pauseTitle">잠시 쉬는 중</h2><div class="stack-actions"><button id="resume" class="primary">이어서 연주 ${icon('play')}</button><button id="inputClick" type="button" aria-pressed="true">${icon('volume-2')} 입력음</button><button id="restartPause">처음부터 ${icon('rotate-ccw')}</button><button id="leavePause">곡 선택으로 ${icon('layout-grid')}</button></div></div></dialog>
  <dialog id="results" aria-labelledby="ending"><div class="modal-content"><p class="modal-kicker" id="endingTag">모험의 기록</p><h2 id="ending"></h2><p id="stats"></p><section class="theory"><h3>오늘의 음악 수첩</h3><p id="lesson"></p><details class="concept-notes"><summary>음악 요소 다시 보기</summary><dl id="resultConcepts"></dl></details></section><div id="quiz"></div><p id="explanation" aria-live="polite"></p><div class="resultactions"><button id="answer" class="primary">정답 확인</button><button id="again" title="다시 연주" aria-label="다시 연주">${icon('rotate-ccw')}</button><button id="resultHome" title="다른 곡 선택" aria-label="다른 곡 선택">${icon('layout-grid')}</button></div><a id="curriculumSource" class="curriculum-source" target="_blank" rel="noopener">학습 내용 근거 · 교육부 2022 음악과 교육과정</a></div></dialog>
  <dialog id="creditDialog"><div class="modal-content"><h2>음악과 픽셀 마법</h2><div id="musicCredit"></div><p>그림: AI 생성 후 게임용 정규화<br>효과: pixelfx / MIT</p><p>픽셀 글꼴: NeoDunggeunmo / SIL OFL 1.1</p><a href="/assets/fonts/NEODGM-LICENSE.txt" target="_blank" rel="noopener">글꼴 저작권·라이선스</a><form method="dialog"><button>닫기</button></form></div></dialog>
  </main>`;
}
