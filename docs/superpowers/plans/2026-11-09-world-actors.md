# World-Specific Character Assets

**Goal:** Replace the shared bard/slime/monster cast with four complete era-specific image casts, keeping song timing and input unchanged.

**Design:** Past conductor and theater automatons; present keytar musician and audio-device creatures; future space musician and synth robots; fantasy elf lyrist and woodland guardians. Five characters per world, all generated together as a 4x3 sheet with twelve poses.

**Architecture:** A typed world catalog owns atlas URL and four enemy names. Shared frame helpers map hero idle/windup/release and enemy idle/hurt. Build script normalizes every actor group with its own shared scale and foot anchor into 128px cells. Canvas and CSS preview consume the same atlas.

- [x] Generate four transparent 12-frame sheets and retain originals/prompts.
- [x] Add failing actor-selection tests and implement world metadata/frame helpers.
- [x] Normalize sheets; verify nonempty alpha, frame bounds and stable anchors.
- [x] Replace canvas characters and preview actors with selected world assets; remove geometric actor fallbacks.
- [x] Build, run unit tests, inspect every stage of every world in browser and verify real gameplay.

## Verification

Four full browser playthroughs reached 4/4 enemies and scored 3/3 on song-specific quizzes. Actual Canvas draw calls included hero and all four enemy pairs in each atlas, verifying 20 distinct in-game characters, not just preview images. Frames 0-11 were observed. Final count-in regression fixes negative idle-frame indexing; corresponding test failed before the clamp and passed after it.

Full release tests: 104 passed across 13 files; TypeScript and production build passed. Captures and report: `output/note-knights/release-v3/`. Full-viewport and actual Fullscreen API checks: `tmp/viewport-qa.mjs`.

**Constraints:** No new music, physics, engine, deployment or changes to musical damage rules. Windup is visual and does not pause audio. All five actors are images, including fallbacks. Preserve other worktree changes.
