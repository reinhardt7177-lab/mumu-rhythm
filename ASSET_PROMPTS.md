# Visual Assets (V7: code-drawn)

V7부터 저장소와 `public/`에는 이미지 파일(webp/png/jpg/jpeg/svg)이 없다. 모든 화면은 런타임에 코드로 그린다.

| 영역 | 렌더러 | 파일 |
| --- | --- | --- |
| 곡 카드·미션·결과 아트 | Canvas 2D 프로시저럴 모티프 | `src/render/songArt.ts` |
| 중앙 9:16 노트 스테이지 | Canvas 2D (스프라이트 캐시) | `src/engine/renderer.ts` |
| 레인 광원·홀드 에너지·타격 파편 | CanvasKit(Skia) 지연 로드, 실패 시 Canvas 2D | `src/render/skiaEffects.ts` |
| 좌우(또는 상하) 뮤직비디오 | WebGL2 셰이더 → Canvas 2D → CSS 그라디언트 | `src/render/mvRenderer.ts` |

## 곡별 모티프

`src/render/visualTimeline.ts`의 `songMotif()`가 색과 모티프를 정한다.

- 네온 런: circuit (회로 선과 노드)
- 구름 점프: clouds (묻고 답하는 구름 계단과 점프 궤적)
- 로봇 퍼레이드: gears (오스티나토 블록과 맞물린 톱니)
- 터키 행진곡: keys (건반과 행진하는 음계)
- 캉캉: frills (겹치는 프릴 곡선)
- 윌리엄 텔 서곡: gallop (산맥과 질주 셰브런)
- 헝가리 무곡 5번: spiral (회전 나선과 길고 짧은 대비)

## Blender의 역할

Blender는 깊이감 설계 도구로만 사용한다. `tools/art/blender/export_stage_geometry.py`가 카메라, 바닥 레일, 터널 링, 별 레이어, 도시 블록을 실제 3D 장면으로 만든 뒤 카메라 투영 좌표만 `src/content/stageGeometry.generated.ts`에 숫자로 기록한다. 렌더 이미지나 `.blend` 파일은 만들지 않는다.
