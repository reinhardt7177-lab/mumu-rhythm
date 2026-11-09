# Pixel Worlds Redesign

**Goal:** Replace the modal-first prototype with a playable retro music-world selector and song-specific pre-play listening briefings.

**Architecture:** Keep Canvas2D, AudioEngine and RhythmGame. Add a typed world catalog, swap the selected song and battlefield art together, and retain keyboard/touch/hold behavior. Presentation remains separate from audio-clock combat.

## Design Tokens

- Ink #171c28, pearl #fff3ce, mint #9be3be, coral #ef8299, gold #ffd276, sky #86d5ec.
- NeoDunggeunmo pixel font (locally hosted with OFL license); readable 16px body, 24/32/48px hierarchy, zero letter spacing.
- First screen: full-width scenic world, game title and world name over art, bottom full-width cartridge selection and play band. No dashboard behind an initial modal.
- In game: narrow vertical rhythm deck and generous scenic battle area, compact enemy HUD, musical pixel FX. Mobile stacks battle above the five-lane deck.
- Different world colors; one consistent stepped pixel border and button language. No decorative gradients, blur, or oversized explanatory copy.

## Scope

- Past: Can-Can / theater; present: Cloud Hop / rooftop; future: Neon Run / orbital concert; fantasy: William Tell / forest.
- Song briefing before every start: origin, instrumentation, two-sentence introduction and listening focus.
- Results and quizzes derive from selected song, never hard-coded Can-Can content.
- New theater, rooftop and orbital backdrops; shared three-creature animation atlas replaces remaining geometric enemies.
- Existing forest, hero, slime, music recordings and musical timing stay intact.

## Implementation Tasks

- [x] Add catalog/quiz regression tests, watch failure, implement typed world and lesson data.
- [x] Normalize new generated images and creature atlas, bundle official pixel font and license.
- [x] Implement selector, briefing, song switching, result lessons and explicit return-to-selection flow; guard input beneath dialogs.
- [x] Implement theme-aware battlefield, all-stage art and pixel UI; remove obsolete layered quest CSS.
- [x] Build, run full unit tests, browser-test four worlds, briefing, sound, keyboard/touch, pause, completion/quiz and responsive layouts.

## Verification

- `npm run build`: passed. Existing legacy CanvasKit browser-externalization warnings remain isolated to studio.
- `npm test -- --pool=threads --maxWorkers=1`: 64 tests across 9 files passed, including four new world/lesson regressions.
- `node tmp/worlds-qa.mjs`: passed with zero page/asset errors. All four worlds started their correct tracks, rendered nonblank canvases and emitted actual audio (analyzer peaks 163-219 in final run).
- Can-Can full clear: 89% collection, combo 27, four enemies defeated. Three selected-song quiz questions scored 3/3; return to selection and another song's briefing verified.
- 390x844 touch scoring: 626. 320px and 390px viewport scrollWidth equals viewport width. Reduced-motion startup included at 320px.
- Long-note engine behavior is unchanged; existing hold regression tests pass. This browser run checked a sustained touch but does not claim to exhaustively play every chart's hold notes.
- Actual screenshots and JSON report: `output/note-knights/worlds-v2/`.
- Review fixes: avoid selector/theme attribute collision, wait through recording count-in when sampling sound, use the actual Korean title 구름 점프, and anchor preview sprites to the covered image's ground baseline.
- Final result-layout polish: shorten the lesson and group options horizontally on desktop. Dedicated layout check reports clientHeight 718 == scrollHeight 718 at 1440x960; result title, questions and actions fit without scrolling. Final build and 64-test suite passed again after this CSS/copy-only change.

## Review Risks

- Selected song, background, lesson and credits must always refer to the same world.
- Starting or switching while loading must not race the audio engine.
- Menus must stop input and music; exit from a paused run must leave audio resumable next start.
- Mobile must preserve readable lanes and accessible controls with no horizontal overflow.
- Failed artwork loads must not prevent playing.
