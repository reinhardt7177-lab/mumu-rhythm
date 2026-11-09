# Four Complete Character Casts

Built-in image generation produced four transparent 4-column by 3-row sprite atlases on 2026-11-09. The output contains 20 distinct characters and 48 poses. This is generated pixel-styled artwork, not a claim of manually drawn historical console assets.

## Shared Prompt

Production sprite atlas for a crisp modern 16-bit musical RPG for schoolchildren. Exact regular 4x3 grid, full-body figures, transparent alpha background, consistent bottom-center anchors and spacious margins. Row one: same right-facing hero in idle, breathing idle, attack windup and release. Row two: left-facing monster one idle/hurt, monster two idle/hurt. Row three: left-facing monster three idle/hurt, boss idle/hurt. Preserve outfit, palette, proportions and scale within each actor group. No text, UI, scenery, gridlines, cropped bodies or external drop shadows.

## Per-World Prompt Details

- Past: young chestnut-haired conductor in ruby tailcoat, pearl shirt, black boots and gold baton. Wind-up music box, ivory opera-mask spirit, brass pipe-organ automaton and burgundy theatrical phantom conductor. Pearl, brass, ruby and midnight teal.
- Present: girl with short navy bob, mint headphones, coral varsity jacket, denim shorts, sneakers and mint keytar. Cyan portable speaker, pink cassette ghost, yellow/mint boombox robot and purple DJ robot with turntable shield. Sky blue, coral, mint and lemon yellow.
- Future: silver-haired space musician, cyan visor, white/navy spacesuit, magenta scarf and synth baton. Orbital note-face drone, cyan hologram spirit, keyboard-chest synthesizer mech and galactic conductor android. Pearl silver, cyan, magenta and navy.
- Fantasy: honey-blonde elf lyrist with leaf circlet, cream blouse, emerald cape and boots. Gold-spotted mushroom, lavender leaf spirit, jade crystal guardian and moon-staff woodland sorcerer. Emerald, cream, gold and lavender.

Raw generated source IDs, respectively:

1. `exec-d8854dc3-9abd-4ec4-bea3-8d8bd68df61b.png`
2. `exec-671fdc55-1c55-49f6-a791-3bd932b8f2c7.png`
3. `exec-309ea9c9-8dd5-466e-b44b-dc1cd2ad9e9f.png`
4. `exec-3da6313c-c660-4ab9-9a4a-6099f936fd2d.png`

## Runtime Preparation

`tools/art/build-world-actors.mjs` retains sources under `output/note-knights/actors-v3/source/`, clears almost-transparent RGB noise, finds each cell's principal alpha-connected subject to exclude disconnected neighbor fragments, and applies a shared scale per actor group. A foot-centered anchor at (64,120) is used within each 128px cell. Runtime atlases are 512x384 PNGs. Originals remain unchanged.

The selected world atlas is used by both CSS preview sprites and Canvas combat. Hero frames are 0-3, enemy pairs are 4/5, 6/7, 8/9 and 10/11. All character fallbacks remain image-based; no geometric placeholder actors are drawn. Musical projectiles and supplementary pixel particles remain procedural effects.

Preview: `output/note-knights/actors-v3/cast-contact.png`, rows past/present/future/fantasy; columns hero and four enemies.
