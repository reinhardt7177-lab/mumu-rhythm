# Chord Sovereigns V8 Verification

## Baseline

Production `f6307ab` at `https://mumu-rhythm.vercel.app/` was played through all four representative songs. Collection100%, enemies4/4 and old quiz3/3 were observed. Native CDP touch verified a completed long note, early release and independent simultaneous pad ownership. This is Chrome touch emulation, not a physical tablet test.

Future-world boss death occurred at76.3% of song progress with12 visible notes remaining. This confirmed the pacing complaint. Existing fixed220 boss HP was replaced with a budget frozen on entry from remaining playable note completions and prior judged damage. No damage immunity, audio-speed changes or repeated damage application was introduced.

## Automated Coverage

- 213 tests in24files, plus TypeScript and Vite production build, passed on2026-11-10. The explicit test command was `npm test -- --pool=threads --maxWorkers=1 --no-isolate`.
- All14 current charts, both play modes and successful GOOD/PERFECT streams are simulated for boss reachability, one-time HP budgeting and a late playable finale. Synthetic sparse/dense charts, completed/missed notes, crossing holds and delayed single-impact damage are covered separately.
- Boss renderer tests cover phase-clock restart, supplied foot anchors, hurt/break/defeat priority, death fade, reset and ignoring ordinary enemy impacts.
- All14 songs in both learning bands have three concept notes and five questions with valid choices, explanation and concept coverage. Question correctness also received source-based review; tests alone do not establish educational validity.

## Visual Inspection

Four normalized8-pose boss contact sheets and four6-state battle galleries were rendered and viewed. A deterministic layout fixture rendered all four bosses at390x844,768x1024 and1440x900. All12 geometry checks passed, with no document overflow or canvas overlap into the skill bar. These fixtures are visual checks, not evidence of gameplay completion.

The portrait tablet now stacks adventure and rhythm views. The battlefield canvas is bounded independently from the flex layout, and portrait framing retains the actors' heads and feet. The briefing body scrolls independently while its start action remains visible.

## Measured HUD Optimization

Same future/neon-run keyboard-player workload,1440x900,12–24seconds after start:

| Metric | Before | After |
| --- | --- | --- |
| Observed document mutations | 11,108 | 1,206 |
| Unchanged records under baseline predicate | 9,947 | 43 |
| p95 frame gap |16.8ms|16.8ms|
| p95 RAF callback JavaScript |0.8ms|1.0ms|
| Long tasks |0|0|

The cached HUD writer skips unchanged text/progress assignments and the journey stage classes update only on stage change. The remaining unchanged records are judgment announcements, not these HUD targets. This is about89% fewer observed DOM mutations, **not a demonstrated FPS gain**. Baseline was already smooth on this PC. Production HTTPS versus local HTTP, synthetic input timing, observer/profiler overhead and concurrent Chrome activity limit timing comparison. RAF timing excludes GPU/compositor presentation.

Raw baseline, after profile, galleries, layouts and full-flow reports remain under `output/note-knights/boss-v8/`. Temporary harnesses are under `tmp/`; both are git-ignored. No new dependencies or services were installed.

## Educational Sources

See `docs/music-curriculum-v8.md` for directly verified official MOE2022 source, achievement-code mapping, grade-band design and limits. Scored questions use explicit teaching examples rather than unsupported claims about the exact recording. The curriculum's full content or physical performance skills are not assessed by these multiple-choice questions.

## Release Gate

Clean browser playthroughs used immutable `quest-BHEo5NRZ.js` (SHA-256 `21eb327ede305b031b43dc862e5ae05b62bb9bece6b385ac52ef5ca2316e2d4b`). All four representative songs completed at100% collection, enemies4/4 and quizzes5/5. Boss death progress was96.77% past,99.88% present,95.80% future and95.55% fantasy. A boss dying with zero remaining visible heads at the finale is valid, not an early-death regression. Charge/cast can be interrupted by a player's chord break; nominal actions are covered separately by renderer tests and galleries.

Native CDP touch and1024x768/768x1024/390x844 dimension checks passed in this clean run. A first diagnostic run exposed harness state carry-over between songs and input misses while taking many screenshots; those attempts are retained, not presented as clean passes. Final production evidence is recorded under a separate production tag after matching this immutable bundle, without overwriting the local observations.

## Production Result

Game release commit `1e6d62bff27bbc92f4d0f69a55ec8db7db7c6eb9`, Vercel deployment `dpl_GqrKFaXsG5dh8G2d6WzzL8hmv2T1`, production alias `https://mumu-rhythm.vercel.app/`. Deployment was READY and served the same JavaScript, CSS and four boss PNG hashes as the tested local build. Licenses were present; pixelfx text differed only in Windows/server line endings. The existing visit counter remained connected.

The clean production run finished2026-11-10 with all four worlds at100% collection, zero MISS and4/4 enemies. Each grade-banded quiz passed unanswered handling, deliberate4/5 grading with per-item explanation, correction and5/5 grading. Boss death was96.72%,99.94%,95.92% and95.55% respectively. Future's third-phase cast was interrupted by a recorded chord-seal break, not silently marked as an observed cast.

Native CDP touch verified a successful hold, early-release handling and independent simultaneous touch contacts.1024x768,768x1024 and390x844 game/library views had no document overflow. Production screenshots were reviewed. All QA browser sessions closed. Physical-tablet latency, actual loudspeaker output and GPU presentation remain outside this emulated test's claims.

Evidence: `output/note-knights/boss-v8/after/production/{report.json,SUMMARY.md}` and `output/note-knights/boss-v8/release/integrity.json`. The documentation-only completion commit does not change the tested game bundle.
