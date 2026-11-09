# Theater V6 Verification

Date: 2026-11-09. Preview: http://127.0.0.1:5201/?v=theater6

## Delivered

Input lighting is now independent of scoring. Every physical key/touch press gives its lane a brief impulse, colored receptor flare and brighter key face. While held, the lane retains a lower-intensity light. Only successful judgments produce the success particles and attacks. Input sources are independent; losing one source does not clear another source on the same lane. Pause, blur, home, restart and completion clear the corresponding held state; pause/completion explicitly repaint the canvas so light is not frozen behind the dialog.

The theater uses a new transparent eight-pose generated conductor sheet, normalized to the existing 128px cell and (64,120) feet anchor. It alternates ordinary casting poses, uses strong preparation/release for accented hits, and has dedicated hold-charge/finale poses. Other eras retain their previous hero rendering and enemy assets; the theater enemies and library preview retain the original cast atlas.

Combo choreography: 0-7 single note, 8-23 duet, 24-47 triad, 48+ five-voice orchestra. Every 8th hit gets an accent; multiples of 64 get seven voices and a finale announcement. Higher-tier impacts add orbiting chord notes or organ-pipe silhouettes. Hold completion keeps its identity on a combo accent and adds its own contact zap. Golden pixelfx variants, staff ribbons and outlined code-drawn notes make the theater effects distinct from the other worlds.

The additional visible voices do not multiply damage. Existing 0.32s damage arrival, music clock, hit windows, score and song recordings remain unchanged. No full-screen flashes or note-canvas shake are added. Cached sprite sheets replace per-frame effect simulation.

## Executed Checks

- `npm test -- --pool=threads --maxWorkers=1`: **138 tests, 18 files pass**. Red/green tests cover source-aware lane impulses, repeat suppression, release/reset, all tier boundaries, alternate/finale poses, converging trajectories, unchanged damage, hold identity on a combo accent, empty-lane illumination, paused rendering and adoption of an active hold while popping a neighboring same-lane tap.
- `npm run build`: **pass**. The existing optional legacy studio CanvasKit externalization warnings remain; no new engine/package was installed.
- `node tmp/theater-v6-qa.mjs`: all eight new pose frames and four golden pixelfx sheets actually drawn in normal/reduced-motion galleries. Desktop 1440x900 and mobile 390x844: all five keys light in their own RGB colors, empty input scores zero, mixed keyboard/touch source release works, pause/blur clears sources, viewport has no overflow. No page/HTTP errors.
- `node tmp/theater-v6-lifecycle.mjs`: real main/engine, normal keyboard and native Chrome touch, deterministic injected overlapping hold/tap pair. Touch pops the tap while keyboard holds the long note; releasing keyboard keeps the touch-owned hold active through completion. Canvas RGB-sum probe returns from lit 239 to baseline 111 on pause, and 250 to 111 on completion. The async pause test waits for the pause dialog/audio suspension to complete, not merely the click dispatch.
- `node tmp/feedback-v5-touch.mjs`: actual visible long-note native-touch break, restart and completion pass; the golden rune and zap sheets render.
- `node tmp/theater-v6-clear.mjs`: actual production challenge-mode song, rendered-head-driven normal keyboard events, no clock or scoring override. Final recorded run: **99% collection, 105 max combo, 4/4 kills, quiz 3/3**, nonzero audio peak 196/255, no runtime errors. Earlier initial V6 pass was 100%/114. These are automated playtests, not a claim of a perfect human playthrough.
- `node tmp/feedback-v5-finale.mjs`: deterministic real-main late boss ending, cancellation on home, immediate result after an early boss kill all pass.
- Focused read-only review found two input lifecycle issues. Both were fixed with regression coverage and rechecked; no remaining findings reported in that scope.

## Evidence and Assets

- `output/note-knights/theater-v6/report.json`: galleries and desktop/mobile input checks.
- `output/note-knights/theater-v6/lifecycle-report.json`: injected overlap/cleanup regression.
- `output/note-knights/theater-v6/clear-report.json`: full-song result/audio/quiz.
- `output/note-knights/theater-v6/1440-input-glow.png` and `390-input-glow.png`: real production input response.
- `output/note-knights/theater-v6/flight-gallery.png`, `impact-gallery.png` and reduced variants: deterministic actual-renderer combo comparisons.
- `public/assets/art/theater-v6/conductor.png`: final transparent game atlas. Full built-in generation prompt, original source ID and normalization steps: `PRODUCTION.md` alongside it. No source was deleted or overwritten.
- `public/assets/pixelfx-v5/theater/`: four offline palette derivatives, covered by the existing pixelfx MIT notice. Source palette and export command: `tools/art/export-theater-fx.mjs`.

Temporary fixtures/scripts remain under ignored `tmp/`, not production debug APIs. This pass is theater-first: input feedback is shared, but the other three eras have not received the new combo choreography. No online deployment, new songs or claims about physical low-end tablet frame rates are included.
