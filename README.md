# MUMU Classical Piano

Canvas 2D와 Web Audio API로 만든 16비트 픽셀 네온 아케이드 5레인 **클래식 피아노 연주형 리듬게임**입니다.
배경 자동 반주가 없고, **노트를 누를 때 그 음(피아노)이 울립니다.** 박자에 맞춰 잘 치면 곡 멜로디가 완성됩니다.

## 실행

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

브라우저에서 열기:

```text
http://127.0.0.1:8080/index.html
```

## 조작

- 곡 선택: 주크박스에서 `‹` `›` 버튼 또는 키보드 `←` `→`
- 시작: `선택한 곡 시작` 버튼 또는 `Space`
- 연주: `A` `S` `D` `J` `K` (낮은 음 → 왼쪽, 높은 음 → 오른쪽)
- 태블릿/모바일: 하단 5개 패드 터치

## 수록곡 (클래식 피아노 독주 10곡)

| # | 곡 | 작곡가 | 난이도 |
|---|-----|--------|--------|
| 01 | Für Elise | Beethoven | NORMAL |
| 02 | 환희의 송가 | Beethoven | EASY |
| 03 | Moonlight Sonata | Beethoven | HARD |
| 04 | Rondo Alla Turca | Mozart | HARD |
| 05 | Clair de Lune | Debussy | NORMAL |
| 06 | Nocturne Op.9 No.2 | Chopin | NORMAL |
| 07 | Gymnopédie No.1 | Satie | EASY |
| 08 | Minuet in G | Petzold | EASY |
| 09 | Canon in D | Pachelbel | EASY |
| 10 | Prelude in C | Bach | NORMAL |

모두 퍼블릭 도메인 작품입니다.

## 현재 구현

- **연주형 메커닉**: 자동 반주 제거, 히트한 노트에서만 피아노 음 발생
- 반음 포함 전음역 음높이 엔진(`noteToFreq`) — 모든 조성/옥타브 지원
- 멜로디(`{n, b}`) → 5레인 채보 자동 매핑(음역 정규화 + 옥타브 폴딩)
- Perfect / Great / Good / Bad / Miss 판정, 점수·콤보·싱크 게이지
- 난이도별 스크롤 속도(EASY/NORMAL/HARD) 및 HARD 동시치기
- 레트로 주크박스 곡 선택(Press Start 2P), 곡별 픽셀 네온 스테이지
- Canvas 2D 유사 원근 5레인 하이웨이, 픽셀 노트/리셉터, 비트 펄스
- 데스크톱/모바일 반응형 HUD

## 채보 데이터

- 멜로디 데이터는 `game.js`의 `songs[]`에 `{n: 음이름|"rest", b: 박자}` 배열로 정적 저장(런타임 MIDI 의존성 없음).
- 6곡(엘리제·월광·터키행진곡·짐노페디·녹턴·클레르 드 륀)은 퍼블릭 도메인 MIDI에서
  `tools/midi_to_melody.mjs`로 멜로디 라인을 추출 후 정리, 4곡은 악보 기반 직접 작성.

## 에셋

- `assets/pixel/bg-*.png`: 픽셀 네온 스테이지 배경 5종(city·arena·school·sunset·galaxy)
- `assets/pixel/mascot-*.png`, `idol-*.png`: 무대 마스코트 포즈
- `assets/pixel/note-gem.png`, `receptor.png`, `hit-burst.png`, `ring.png`: 노트·이펙트(코드에서 5색 틴팅)

## QA 보기

```text
http://127.0.0.1:8080/index.html?demo=1&demoTime=7
```
