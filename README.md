# MUMU Rhythm Prototype

Canvas 2D와 Web Audio API로 만든 16비트 픽셀 네온 아케이드 5레인 동요 피아노 리듬게임입니다.

## 실행

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

브라우저에서 열기:

```text
http://127.0.0.1:8080/index.html
```

## 조작

- 시작: `선택한 동요 시작` 버튼 또는 `Space`
- 키보드 입력: `A`, `S`, `D`, `J`, `K`
- 태블릿/모바일 입력: 하단 5개 패드 터치

## 현재 구현

- 오디오 시간 기준 노트 이동 및 판정
- Perfect / Great / Good / Bad / Miss
- 점수, 콤보, 싱크 게이지
- 10곡 동요 선택 캐러셀
- 곡별 생성 이미지 카드, 제목, 난이도, 교육 포인트
- 선택한 동요 멜로디 기반 30초 이상 피아노 리듬액션
- 5레인 키보드/터치 입력
- Canvas 2D 유사 원근 5레인 하이웨이, 픽셀 노트/리셉터, 곡 클럭 기반 비트 펄스
- 곡별 픽셀 네온 스테이지 배경(시티·아레나·학교·선셋·은하수), 무대 아이돌 마스코트(포즈 전환), 풀링 파티클·퍼펙트 링
- Web Audio API 기반 피아노 키음형 노트 사운드
- 데스크톱/모바일 반응형 HUD

## 에셋

- `assets/pixel/bg-*.png`: 픽셀 네온 스테이지 배경 5종(city·arena·school·sunset·galaxy)
- `assets/pixel/mascot-*.png`, `idol-*.png`: 아이돌 마스코트 포즈 + 추가 퍼포머
- `assets/pixel/note-gem.png`, `star-note.png`, `receptor.png`, `hit-burst.png`, `ring.png`: 노트·이펙트(코드에서 5색 틴팅)
- `assets/pixel/hero.png`, `fever-aura.png`, `bg-crowd.png`: 타이틀/연출용
- `assets/songs/*.png`: 동요 선택 카드 이미지
- 픽셀 에셋은 힉스필드(nano_banana_pro)로 생성 후 `tools/process_assets.py`로 크로마키·크롭·리사이즈. `*-raw.*` 원본은 git 제외

## QA 보기

비주얼 캡처용 자동 데모:

```text
http://127.0.0.1:8080/index.html?demo=1&demoTime=1.35
```
