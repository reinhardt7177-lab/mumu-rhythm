# Learning Bank 120 Implementation Plan

**Goal:** Apply the approved phase-one educational bank to the rhythm game:32 visual,40 listening,24 concept questions and24 distinct activities, with linked teaching material and feedback.

**Architecture:** Typed local content modules, a single cancellable sample-audio player, lazy-loaded proven music engraving, and a reusable learning panel for result quizzes and a browsable music notebook. Preserve the rhythm engine, audio clock, world combat and current full-viewport layout.

**Spec:** `docs/education/elementary-music-bank-blueprint.md`, approved by the user2026-11-10. Formal primary scope3~4/5~6 grades; activities are separate from automatically graded questions.

## Tasks

- [x] Establish typed content contracts and failing bank/selection tests.
- [x] Author12 lessons with two learning levels,24 meaningful activities,96 validated questions; do not inflate totals with shuffled choices. Reviewed and corrected opening-rest reference, onset-vs-decay, gu-eum activity placement and higher-grade progression.
- [x] Acquire redistributable real instrument samples, exact source/license registry, bounded audio files and numeric audibility checks. Six CC0 VSCO recordings total1.47MB; retain6.64s piano release.
- [x] Render note/rest pictures with VexFlow, including score choices and accessible non-answer-leaking descriptions. Initial desktop/mobile screenshots reviewed.
- [x] Add replay/stop/volume and loading/error/cancellation lifecycle for listening examples, isolated from the game audio clock.
- [x] Connect five-item mixed result sets and a browsable all-content music notebook with explanations, lessons and activities. All96 questions,24 activities and24 grade-level lesson views browsed in Chrome; teacher Markdown/JSON exports connected.
- [x] Verify all items, audio timing and races, real result flow, desktop/mobile/tablet screenshots, touch/keyboard controls and game regressions.275 unit tests,5 Python checks,96 browser questions,24 activities,24 grade-level lesson views,60 rendered clips,6 live browser meters. Four-world baseline and final-build full theater/touch rerun passed. Physical classroom/tablet validation remains outside this implementation.

## Quality Gates

- Every scored item has exactly one correct option, an objective, lesson, grade, explanation and misconception feedback.
- Every listening stimulus has validated event timing and a licensed, locally hosted sample. No sine-wave stand-ins presented as acoustic recordings.
- Every activity has instructions and observable/self-reflection criteria, not a forced correct feeling or creative answer.
- Failed audio loads never count as incorrect answers. Stop previous audio on replacement, navigation, new game and dialog dismissal.
- Notebook and result navigation must preserve game input ownership, fit390px mobile width, and not add per-frame educational DOM work.
- Rendering and listening modules are loaded only when needed, not into the game animation loop.

## Ownership

Parent: contracts, selection logic, notation/audio components, UI integration and final verification. Content and asset workers have disjoint files under `src/quest/bank/`, `public/assets/audio/quiz-v1/` and `tools/music/`.
