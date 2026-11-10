# Chord Sovereigns V8

Four new AI-generated transparent pixel-styled boss sheets, made with the built-in image tool on 2026-11-09. Existing actor sheets were viewed for world identity and scale before generation. No third-party game character art was copied. These are AI-generated game assets, not a claim of hand-drawn console sprites.

| World | Generated Source | Atlas |
| --- | --- | --- |
| Theater | exec-f89bb913-52cf-4a86-ad25-98a7e784c794.png | past/boss.png |
| Rooftop | exec-6e03578f-dbfc-4216-9b3c-d2efb57679f8.png | present/boss.png |
| Orbit | exec-fd27a943-d267-4d64-a8f6-d220381d2a3c.png | future/boss.png |
| Fantasy | exec-4a73b955-1046-4230-be5a-271497a7f848.png | fantasy/boss.png |

Original files are retained unchanged in the generated-images destination and `output/note-knights/boss-v8/art/<world>/source.png`. Contact sheets and bounds were inspected after normalization.

## Generation Direction

Shared prompt requirements: production pixel-art RPG animation atlas, transparent alpha, exactly four columns by two rows, eight isolated full-body poses of the same boss. Face LEFT toward the player. Consistent character proportions and planted feet, generous cell margins, crisp dark outlines, readable 16-bit pixel clusters. No scenery, text, grid lines, external glow, floating effects or opaque matte. Row-major poses: idle, breathing, charge anticipation, casting, enraged, hurt, chord seal broken/kneeling, defeat. Preserve the same identity, instrument and outfit through all eight poses.

World-specific prompt direction:

- Theater: phantom maestro, ivory half-mask, pipe-organ crown, burgundy and gold cape, musical conductor staff. Readable swept cloak and arm silhouettes, golden orchestral identity.
- Rooftop: imposing but child-friendly Bass King DJ robot, purple and coral body, gold equalizer crown, two attached speaker towers and turntable waist. Stereo street-music identity, visibly different charging and arm-extended release.
- Orbit: celestial synth conductor in silver, navy and magenta armor, orbital halo, keyboard chest and synthesizer baton. White/cyan highlights and swinging cosmic cape.
- Fantasy: Moonlight Harp Queen, violet hair, branch/moon crown, golden crescent harp, emerald and plum robes. Lyrical string-plucking anticipation and wide resonant casting gesture.

## Normalization

`tools/art/build-theater-poses.mjs --source <original> --out public/assets/art/boss-v8/<world> --archive output/note-knights/boss-v8/art/<world> --name boss.png --height 104 --margin 2 --sharp <bundled-sharp-path>`

Equal-cell extraction uses alpha bounds. A single scale is used per actor, with feet at (64,120). Sheets are 512x256, 128px cells, nearest-neighbor resampled. Each manifest records source filename and per-pose bounds. The game draws each cell at 176px using the existing shared world foot anchors; kneeling and defeat poses are intentionally shorter.

## Rendering and Effects

Three HP movements use beat-based 8/6/4-beat cycles. Each new movement begins with a readable anticipation period. Charge, cast, hit, seal break and defeat are separate poses. Boss attacks are visual-only on the adventure canvas: no surprise dodge controls, second miss penalty or changes to the music clock. Original Canvas code draws musical staffs, EQ packets, constellation notes and harp stars. Existing pixelfx effects retain their existing MIT provenance and license in `/assets/pixelfx-v5/`.

Player attacks now rotate through three phrase trajectories, with a 32-combo cadenza and 64-combo finale. These do not add damage events or freeze the rhythm simulation. Reduced-motion mode omits actor echoes, shake and ornamental rotation. Local deterministic visual evidence is in `output/note-knights/boss-v8/gallery/`; normal-speed gameplay evidence is recorded separately.
