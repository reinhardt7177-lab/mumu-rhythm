# MUMU Rhythm Prototype

Three.js와 Web Audio API로 만든 5레인 동요 피아노 리듬 액션 프로토타입입니다.

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
- Three.js 기반 3D 레인, 노트, 콘서트 조명, 이퀄라이저 오브젝트
- 생성 이미지 기반 무대 배경, 노트/히트 이펙트 아틀라스, 하단 판정 패드
- Web Audio API 기반 피아노 키음형 노트 사운드
- 데스크톱/모바일 반응형 HUD

## 에셋

- `assets/stage-backdrop.png`: 생성 이미지 무대 배경
- `assets/note-effects.png`: 투명 노트/히트 이펙트 아틀라스
- `assets/judgment-pads.png`: 투명 하단 판정 패드
- `assets/songs/*.png`: 동요 선택 카드 이미지 10종

## QA 보기

비주얼 캡처용 자동 데모:

```text
http://127.0.0.1:8080/index.html?demo=1&demoTime=1.35
```
