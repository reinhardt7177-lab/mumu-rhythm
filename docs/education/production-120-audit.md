# 배포본 120항목 전수 검사

검사일:2026-11-10. 대상: https://mumu-rhythm.vercel.app/

배포 커밋:`db78a7402d916fe7da9cc386428af4d554e7b90d`.
Vercel:`dpl_7nWPbWCb5q8yWogPyBZcdWXY82Ta`,production READY.
실제 받은 JS:`quest-4iKHSmFg.js`,SHA256
`eb9fbb5e368b37a5e6fe1a1befd11f017ac0c38ebddd435e6d65de4bda3b7385`.
배포 JS,문제은행 JSON,6종 WAV가 검증한 로컬 파일과 일치함을 확인했다.

## Chrome 터치 환경

두 환경 모두 배포 URL의 실제 DOM·파일만 사용했다. 개발 서버의 소스 모듈을 가져오거나,정답·시간·점수·오디오 이벤트를 주입하지 않았다. 듣기 클립은 전부 자연 종료까지 재생했다.

| 항목 | 가로1024×768 | 세로768×1024 |
| --- | --- | --- |
| 그림32+듣기40+개념24문항 | 96/96 통과 | 96/96 통과 |
| 수행·성찰 활동 | 24/24 통과 | 24/24 통과 |
| 학년별 교육자료 | 24/24 통과 | 24/24 통과 |
| 실제 듣기 클립 전체 재생 | 60/60 통과 | 60/60 통과 |
| 미선택·오답 해설·정답 수정 | 전 문항 통과 | 전 문항 통과 |
| 문항·교육자료·활동 화면 경계 | 144/144 통과 | 144/144 통과 |
| 기록된 실제 브라우저 터치 down | 711회 | 711회 |
| JavaScript 예외 | 0 | 0 |

듣기는 재생 버튼의 상태만 보지 않고,AudioContext 출력에 분석기를 연결하여 실제 신호를 측정했다. 이벤트별 음높이 변환율,시작 예약 시각,자연 종료도 원본 자극 데이터와 대조했다. 두 환경의 클립별 최대 진폭은0.10496~0.27291로,무음이나 hard clipping을 발견하지 않았다. 5~6학년의 점점 세게·여리게 자극은 실제 출력의 음별 최대 진폭 변화 방향도 확인했다.

음표·쉼표 그림은 문항 및 교육자료의72개 오선 SVG를 가로 환경에서 개별 캡처했다. 두 환경 모두 Bravura 로딩,그림 개수,빈/비정상 SVG,실제 글리프 잉크 영역과 viewBox 경계를 확인했다. SVG text의 getBBox는 실제 그림보다 큰 글꼴 em 여백을 포함하므로,글리프 실제 bounding metrics와 도형 변환 행렬을 사용하여 잘림과 구분했다. 점쉼표·음표 꼬리·덧줄·높낮이 예시를 스크린샷으로 검토했다. 악보 확대·축소도 터치로 작동했다.

활동24개는 과제,순서,관찰 기준,성찰 내용이 모두 표시되고 자기 관찰 체크박스가 터치되는지 확인했다. 창작·감상 활동의 교육적 성취를 자동으로 판정했다는 뜻은 아니다.

## 게임 연결

공개 배포본에서 극장 전체 플레이 후4/4 처치와 새 혼합 퀴즈5/5를 확인했다. 자동 키보드 플레이 수집률은99%였으며 게임 시간·점수·체력은 변경하지 않았다.

같은 배포본에서 Chrome CDP의 신뢰된 터치 이벤트로 다음을 확인했다.

- 두 접점의 독립적인 레인 입력.
- 롱노트 누름 유지와 완료.
- 조기 손 떼기의 MISS 판정.
- 게임 중 음악 수첩 열기와 일시정지 연결.

## WebKit 부분 검사와 한계

이미 설치된 Windows WebKit26.5를 아이패드형 사용자 에이전트와768×1024 터치 화면으로 실행했다.32개 그림 문항과24개 개념 문항의 채점,24개 활동,24개 학년별 교육자료 및 전체 문항의 배치는 통과했다.

그러나 이 설치본에서는 보안 연결에서도 `AudioContext`,`webkitAudioContext`,`AudioNode`,`BaseAudioContext`,`OfflineAudioContext`가 모두 undefined였다. 따라서 듣기40문항은 **소리·채점 검사에서 제외**했으며 WebKit 전체 통과로 기록하지 않았다. 이 결과는 설치된 테스트 엔진의 제한이지,실물 Safari의 소리가 안 난다는 판정이 아니다. API를 가짜로 넣어 검사를 통과시키거나 Safari 지원을 추정하지 않았다.

이 검사는 실제 태블릿이나 외부 스피커·이어폰의 녹음이 아닌 PC 브라우저 터치 에뮬레이션이다. 실물 iPad Safari,Android 기기의 OS 음량·무음 모드·오디오 출력 경로,사람이 듣는 음색 품질,교사·학생 현장 검증은 남아 있다. Playwright의 WebKit도 설치된 Apple Safari 앱 자체는 아니다: https://playwright.dev/docs/browsers

## 재현과 증거

검사 도구:`tools/qa/learning-production.mjs`. 이미 있는 Playwright 경로를 `PLAYWRIGHT_MODULE`,Chrome 경로가 다르면 `CHROME_PATH`로 지정한다. 기본값은 공개 배포 URL과 가로·세로 두 터치 환경이다.

```powershell
node tools/qa/learning-production.mjs
```

Web Audio가 없는 엔진의 시각 검사만 의도적으로 수행하려면 `QA_ENGINE=webkit`,`QA_ORIENTATIONS=tablet-portrait`,`WEBKIT_PATH`와 `QA_PARTIAL_ON_UNSUPPORTED=1`을 지정한다. 이 경우 보고서는 partial이며 전체 pass가 되지 않는다. 필요한 브라우저를 자동 설치하지 않는다.

로컬 증거(출력 폴더는 Git 제외):

- `output/note-knights/learning-120/production-audit/report.json`:가로·세로 전체 결과,음원 해시,60개씩의 실제 재생 측정,SVG 경계,레이아웃과 터치 수.
- 같은 폴더의 `glyphs/`:72개 실제 오선 그림 캡처와 대표 화면 PNG.
- `production-audit/webkit/report.json`:시각 검사 통과와 듣기 제외 항목을 구분한 부분 보고서.
- `production-audit/webkit/capability.json`:관측한 WebKit 소리 API 제공 여부.
- `production-touch-audit/game-browser-report.json`:배포본 전체 플레이와 멀티터치·롱노트 결과.

앱 코드 수정이나 추가 배포는 하지 않았다. 이번 변경은 재현 가능한 검사 도구와 검사 기록뿐이다.
