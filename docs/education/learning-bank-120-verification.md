# Learning Bank 120 Verification

Verified locally2026-11-10. This work does not publish a GitHub/Vercel release.

## Delivered Scope

- 96 scored questions:32 visual,40 listening,24 concept. Each grade band has16 visual,20 listening,12 concept questions.
- 24 separate performance/reflection activities:one per lesson and grade band. These are not forced into automatic right/wrong grading.
- 12 lessons with24 grade-level teaching texts, examples, practice guidance, misconceptions, prerequisite links and curriculum references.
- Conventional note/rest engraving, dotted notes/rests, pitch/chord examples and label diagrams. Both question and answer scores support enlargement.
- Six CC0 recorded instruments: piano,flute,violin,trumpet,clarinet,cello(section).60 timed listening clips include beat/rhythm/rests,pitch,melody,dynamics,tempo,timbre,harmony and form.
- Results select two visual,two listening and one concept question. The first two prioritize song elements; the rest broaden the learning scope. Song-dependent deterministic rotation avoids the same first set in every world; repeated rounds can include every lesson, including gugak.
- Notebook supports grade/lesson filters, all content, answer feedback, lesson jumps, prerequisite navigation and return to the same question/selected answer.
- Teacher material: `music-bank-120.md`; structured data: `/assets/education/music-bank-120.json`. Both generated from the typed bank rather than maintained as separate question copies.

## Commands And Evidence

`npm test -- --pool=threads --maxWorkers=1 --no-isolate`: **275/275 passed in33 files**.

`python tools/music/build_quiz_samples.test.py`: **5/5 passed**.

`python tools/music/build_quiz_samples.py --verify`: exact sample hashes,PCM16 headers,roots,gains,RMS and1,467,650-byte WAV budget passed. Piano's6.637s recorded release is an accepted exception to the internal2–4s asset target.

`node tools/education/export-bank.mjs --check`: teacher Markdown/JSON match source content.

`npm run build`: TypeScript and Vite passed. Vite warns about the lazy728KB VexFlow/font chunk and pre-existing CanvasKit browser externals; these are not build failures. Engraving loads on first score display, not on the rhythm frame loop.

Browser tools require an existing Playwright installation. Set `PLAYWRIGHT_MODULE` to its `index.mjs` when it is not locally resolvable. Set `CHROME_PATH` if the installed Chrome path differs.

```powershell
# Source dev server at5206, then:
node tools/qa/learning-bank.mjs
# Built preview at5201, then:
node tools/qa/learning-game.mjs
```

Output evidence is under ignored `output/note-knights/learning-120/`:

- `bank-browser-report.json`: all96 questions graded correctly through real UI,24 activities and24 lesson views reached. All60 clips rendered through the production scheduler with decoded real recordings; nonzero unclipped waveforms. Crescendo/diminuendo window RMS is monotonic; the slowing-pulse stimulus has increasing measured onset intervals.
- All six instruments produced live browser output peaks around0.19–0.21. Loading failure/retry and cancellation-before-grading passed. Previously unseen/cancelled/failed clips do not become scored wrong answers.
- Desktop1440×900,tablet1024×768 and768×1024,mobile390×844: no document or notebook-body horizontal overflow; dialog stayed within viewport. Screenshots inspected for notation,rest pictures,choice layout and game HUD.
- Four-world full-play baseline: theater99%,rooftop100%,space100%,fantasy100%; every world4/4 defeated and5/5 mixed result quiz. Keyboard player follows rendered heads without changing time,score,HP or game state.
- Final JS build: `quest-4iKHSmFg.js`,SHA256 `eb9fbb5e368b37a5e6fe1a1befd11f017ac0c38ebddd435e6d65de4bda3b7385`. After song-seeded selection and higher-grade listening refinements, full theater rerun100%,4/4,5/5; notebook pause/return passed. That run loaded `quest-99_6ls3Y.js`; the final CSS-only selector-width rebuild renamed the JS asset but its bytes have the identical SHA256.
- Both baseline and final-build native CDP touch checks passed:two contacts held independently,long-note completion,early-release MISS,notebook touch opening. Final evidence: `final/game-browser-report.json`. Final mobile-only CSS gives the lesson selector more width; it does not change game logic.
- Final layout/asset smoke:1440,390 and320px widths, full selected lesson text fits; education JSON,audio registry and notation notices all return200. Screenshots reviewed; evidence `final/layout-assets.json`.

## Content Corrections From Review

- Opening-rest items now include audible preparation beats; no reliance on uncertain button/network timing.
- Half-beat placement compares note starts rather than treating a short acoustic decay as a sustained note duration.
- Timbre prompts no longer eliminate their distractors without listening.
- Higher-grade dynamics uses within-phrase crescendo/diminuendo; tempo includes widening beat-start intervals rather than only lower-grade A/B contrasts.
- Gugak activity requires changing actual syllable placement/extension, not only replacing lyrics.
- VexFlow rest sentinel preserves whole-rest line placement; automatic stem direction follows note position. Accessible labels describe shapes,staff positions and dots without supplying answer names.
- Browser-native fetch is invoked without an invalid player receiver. A failing regression and actual Chrome reproduction established the fix.
- Cancelling a pending audio load cannot bypass availability checks during notebook grading.

## Limits

This is the approved phase-one core for grades3–6, not a claim to cover all elementary standards or all2026 attachments. The research source boundary is recorded in `elementary-music-bank-blueprint.md`.

No teacher/student field trial,psychometric difficulty calibration,physical tablet/speaker test or screen-reader session was performed. Synthetic keyboard/CDP touch and numeric audio verification are not substitutes for those checks.

The six samples are single recorded pitches transposed and scheduled. The wind/string examples are short articulations,not sustained or live ensemble recordings. Natural tuning,attack and perceptual loudness differ; no perfect acoustic equivalence is claimed. See `quiz-audio-provenance.md`.

Activity checkboxes are temporary self-observations,not saved assessment records. Question selections survive notebook lesson jumps in the current session but reset when the notebook closes. Result rotation is per page session,not a student-progress database.

MIT and embedded-font OFL notices are redistributed and linked from credits. See `notation-provenance.md` and `/assets/notation-licenses/NOTICE.txt`. Existing visit-counter script was preserved; its localhost CORS console warning is unrelated to audio or question loading.
