# World Attacks V7 Verification

Date: 2026-11-09. Local production preview: http://127.0.0.1:5201/?v=worlds7

## Delivered

- Three transparent eight-pose actor sheets, 24 new poses total: rooftop keytar girl, orbital synth-baton musician and fantasy lyrist. Idle, preparation, alternating casts, strong preparation/release, charge and finale share a tested foot pivot. Existing monsters/backgrounds/recordings are retained; decode fallback remains image-based.
- Shared 0-7 / 8-23 / 24-47 / 48+ progression with 1/2/3/5 visible voices and a seven-voice 64-hit accent. Rooftop uses equalizer packets, stereo waves and speakers; orbit uses diamond notes, curved orbits, rails and hologram arrays; fantasy uses musical arrows, resonant strings, harp silhouettes and star blossoms. These are different shapes and trajectories, not palette-only copies.
- Twelve offline pixelfx palette derivatives for theme-matched critical hit, rune, completion zap and combo burst. Note-lane effects, damage labels and victory flourishes follow the selected theme. Existing keyboard/touch lane feedback remains shared.
- Only the selected world's extra four sheets load, once per session after a successful decode. Shared caching deduplicates note/battle requests. Music starts only after selected visual readiness. Failed HTTP/decode loads are removed from the pending cache so world reselect/restart can recover.
- A combo milestone reached while no enemy is alive now triggers a visual-only encore. It cannot enter the damage queue. This prevents an earned64 combo from silently missing its finale while encounters are song-progress-gated. Active/released hold and finale pose choice is centralized; finale wins briefly without releasing the hold or changing its input state.

## Verification

- `npm test -- --pool=threads --maxWorkers=1`: **151 tests in 20 files pass**.
- `npm run build`: **pass**. Existing optional legacy studio CanvasKit `fs`/`path` externalization warnings remain. No new engine/package was installed.
- `tmp/world-attacks-v7-qa.mjs`: eight actual-renderer gallery modes (four worlds, normal/reduced motion); all eight pose slots per world and every selected critical/rune/zap/combo sheet drawn. Includes normal64, released-hold64, sustained charge, accented hold completion and boss death. Released-hold64 explicitly must draw frame7. Reduced-motion galleries do not translate the battle canvas. The note canvas is not shaken.
- Production mobile checks at 390x844 for all three new worlds: correct key glow, source cleanup after pause, no viewport overflow, no page errors. Desktop galleries use1600x1100 captures; full-song production play uses1440x900.
- Loading checks: no present/future/fantasy effect requests on initial theater selection. Each first world selection requests exactly four PNGs and four JSON files; selecting a cached world requests no additional effect assets.
- `tmp/world-attacks-v7-holds.mjs`: native Chrome touchStart/touchEnd on real visible long notes in all three worlds. Early release stops the hold and misses; restart clears state; sustained touch completes successfully. The actual note canvas draws each world's rune and completion zap, not only the battle canvas.
- `tmp/world-attacks-v7-clear.mjs`: two rounds of three production songs, normal keyboard events driven by rendered heads, no clock/score override. Latest round: rooftop **100% /109 max combo**, orbit **98% /223**, fantasy **100% /93**; all **4/4 kills and quiz3/3**, nonzero audio peaks186/184/77, no runtime errors. All eight poses, including finale7, were observed in each latest full-song run. Initial round reached100% in all three but exposed the missing-finale-during-gating issue; latest round verifies its fix. The final released-hold pose-branch correction was subsequently covered by the explicit all-world gallery and unit regression, not a third full-song rerun.
- `tmp/world-attacks-v7-encore.mjs`: deterministic actual-main injection of an earned64 judgment while HP0. All four worlds render pose7; HP remains0, kills1, wonfalse; home clears the encore. This is a separate injected edge case, not a claim of a naturally occurring song timestamp.
- `tmp/world-attacks-v7-recovery.mjs`: intentionally return503 once for rooftop critical-hit metadata. Actual main reselects the world, requests it a second time, then successfully draws the recovered sheet on the note canvas. Unit tests separately cover transient decode failure and concurrent request deduplication.
- `tmp/theater-v6-lifecycle.mjs`: previous keyboard/touch shared-hold regression still passes after visual-ready integration. Same-lane touch can pop a tap while maintaining a keyboard-started hold; pause/completion canvas illumination returns to baseline.

## Review Fixes

Focused read-only review identified permanently cached failed effect preloads; HTTP/decode retry tests reproduced and fixed it. A follow-up found released-hold pose selection bypassed finale priority in two renderers; both now use one pure pose selector with released-hold semantics and an explicit browser64-hold case. No changes to damage, flight arrival (0.32s), judgment windows, audio playback rate or input ownership are part of this upgrade.

## Evidence and Boundaries

Reports, galleries, native-hold screenshots, actual full-song screenshots, source copies and contact sheets are under `output/note-knights/world-attacks-v7/`. Key reports: `report.json`, `holds.json`, `clears.json`, `encores.json`, `recovery.json`. Temporary harnesses live under ignored `tmp/`, not production debug APIs.

Final actor paths and exact built-in image-generation prompts: `public/assets/art/world-attacks-v7/PRODUCTION.md`. Atlas manifests contain all occupied frame rectangles and the (64,120) pivot. Orbit uses a2px internal margin to accommodate the scarf/baton without reducing body scale excessively.

This pass does not add music or claim to have replayed all14 library songs. No physical low-end tablet performance benchmark, deployment or push is claimed. Local preview remains available; the temporary fixture server is stopped after verification.
