# Deployed World Journey Audit

Goal: verify the published four-world journey through actual play, result quizzes, incorrect-answer explanations and linked grade-specific lessons on desktop and mobile.

- [x] Verify the public code and question-bank hashes against the reviewed build.
- [x] Run theater, rooftop, space and fantasy to natural completion on desktop with rendered-note keyboard input.
- [x] Run all four worlds to natural completion at390x844 using trusted CDP touch input, covering the opposite grade band for each world.
- [x] Submit wrong answers, verify each misconception and explanation, open every linked lesson and confirm grade, lesson content and preserved quiz answers.
- [x] Correct every answer, regrade5/5, verify home navigation and review screenshots, including320px results.
- [x] Record reproducible evidence and limitations; investigate any actual failure before changing application code.

Files: tools/qa/world-journey.mjs provides the bounded browser audit. Final evidence is under output/note-knights/world-journey/release-cfb44e8/<profile>/. Initial scope was inspection; the user approved fixing and deploying the narrow-screen defect discovered during the audit.

Issue found in the initial deployment:320px result fieldsets expanded to fit VexFlow's300px minimum, and fixed inline SVG/host dimensions prevented true responsive scaling at390px too. A layout-only fixture reproduced it before the fix. Commit cfb44e8 removes fixed inline dimensions, constrains the result fieldset and notation grid, and preserves zoom. All288 result-layout cases and3 zoom round trips passed;386 unit tests,build,export consistency,and the96-question/60-clip learning browser regression also passed. Production dpl_BHDYdydfpggm4E2vfhWd9Tnysasz was READY before the full journeys were rerun.

Final result:8/8 natural completions,all4/4 kills,40 wrong-answer explanations and lesson links checked,all8 quizzes corrected to5/5.20 listening plays,68 journey layout checks and801 trusted mobile touch-down events were recorded,with no JavaScript or observed asset HTTP errors. Details and limitations:docs/education/four-world-quiz-audit.md.
