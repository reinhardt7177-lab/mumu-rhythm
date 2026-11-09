# World Attack Sprites V7

Built-in image generation produced three transparent 4-column by 2-row hero sheets on 2026-11-09. References were the top-row heroes in `public/assets/art/actors-v3/{present,future,fantasy}.png`, identity/palette only. Enemies and backgrounds were not regenerated. No CLI/API fallback or new package installation was used.

| World | Source ID | Final Atlas |
| --- | --- | --- |
| Rooftop / present | `exec-c99762a5-a4d8-43b6-92bb-b36fbd2161af.png` | `present/hero.png` |
| Orbit / future | `exec-d8da2aac-7c2f-4a28-8364-424479a7da61.png` | `future/hero.png` |
| Fantasy | `exec-e60bbffc-fde0-4a91-b28b-71b4b40d1f11.png` | `fantasy/hero.png` |

Sources remain unchanged under `output/note-knights/world-attacks-v7/{world}/source.png` as well as the original generated-images destination. This is newly AI-generated pixel-styled artwork, not a claim of hand-drawn console sprites.

## Rooftop Prompt

Production pixel-art RPG animation sprite sheet. Reference is IDENTITY ONLY of the TOP ROW HERO girl, ignore monsters. Same navy bob haircut, mint headphones, coral varsity jacket, denim shorts, sneakers, mint KEYTAR instrument strapped across body. Face RIGHT in every pose. EXACT 4 COLUMNS x 2 ROWS uniform grid with 8 full-body poses, landscape transparent alpha background. One isolated character centered in each cell, generous margins, same proportions and planted foot baseline, no scenery, gridlines, text, particles or glow. Crisp dark outline and intentional 16-bit pixel clusters, high quality. Row-major frames: 0 relaxed ready holding keytar; 1 knee bend preparing a key strike; 2 strong right hand striking high keys, left hand on keytar neck, lean forward; 3 clearly different upward strum and extended leading leg; 4 power-chord preparation both shoulders pulled back, keytar tilted upward; 5 forceful wide power-chord strike leaning forward with jacket flared; 6 sustained-chord charge with both hands pressing keys close to chest, focused eyes; 7 energetic finale with keytar raised diagonally and free arm extended, both feet visible on baseline. The keytar remains recognizable in ALL frames. SAME girl and outfit in all eight cells, expressive silhouette changes, not eight unrelated portraits. Transparent background, no drop shadow, no opaque matte.

## Orbit Prompt

Production-ready transparent pixel-art game animation sprite sheet, EXACT FOUR COLUMNS by TWO ROWS, eight full-body isolated poses. Reference is identity/palette ONLY of TOP ROW silver-haired space musician hero; ignore all enemies. Same silver short hair, cyan headset/visor, white/navy futuristic suit, dark gloves/boots, magenta scarf and cyan SYNTH BATON. Facing RIGHT throughout, same body proportions and foot baseline, generous equal cell margins. Crisp high-quality 16-bit pixel clusters, dark outlines, no smooth painting. No scenery, grid, labels, UI, shadows, glowing particles or effects. Genuine transparent alpha. Row-major frames:0 ready with synth baton lowered;1 crouched anticipation with baton pulled back;2 one-arm forward rail-cast pointing baton right;3 alternate upward sweeping baton cast with free hand reaching forward and scarf swinging;4 two-arm high power preparation;5 strong forward two-arm synthesizer blast pose, scarf and coat extended;6 concentrated charge holding baton horizontally in front with both hands;7 constellation finale, baton raised overhead and free arm extended toward right, full body grounded and both boots visible. Exactly one same hero per cell, 4x2 uniform grid. Distinct leg/arm silhouettes but consistent character scale. Retain cyan silver and magenta identity. NO external effects, weapons besides synth baton, monsters, background or opaque matte.

## Fantasy Prompt

Create production-ready transparent pixel art RPG sprite animation sheet, EXACT FOUR COLUMNS x TWO ROWS, eight full-body poses with generous cell margins and uniform scale/feet baseline. Reference identity ONLY: TOP ROW honey-blonde elven lyrist with braided hair, green leaf circlet, cream tunic, emerald cape, brown boots, small golden LYRE/HARP. Ignore monsters. Same character faces RIGHT in all frames, full pointed ears and boots visible, harp recognizable in every pose. High-quality 16-bit crisp dark outline pixel clusters, limited gold cream emerald lilac palette, not smooth painting. Genuine transparent alpha, no scenery, no grid lines, no text, no floating particles, no shadows or external effects. Row-major frame0 calm ready holding harp;1 anticipation pulling right plucking hand back;2 forward single-string pluck, harp held forward in left hand;3 alternate higher-string pluck with free arm sweeping up and cape lifting;4 strong chord preparation with harp lifted and plucking arm back;5 emphatic wide strum leaning toward right, cape flared;6 long-note charge stretching a resonant string like a musical bow with focused closed eyes, keep LYRE intact;7 star-song finale harp raised high and free arm extended right, both feet grounded. All 8 frames depict SAME elven musician, same outfit/proportions, expressive different readable arm/leg silhouettes. Exactly 4x2 uniform grid, one isolated character per cell, no opaque matte.

## Normalization and Playback

Reproducible tool: `tools/art/build-theater-poses.mjs --source <original> --out public/assets/art/world-attacks-v7/<world> --archive output/note-knights/world-attacks-v7/<world> --name hero.png --sharp <bundled-sharp-path>`.

The tool extracts equal cells from alpha, scales all frames uniformly per actor, and aligns their feet at (64,120). Final sheets are 512x256, 128px cells, nearest-neighbor sampled. Orbit uses `--margin 2` because of the wide scarf and baton, preserving a comparable body height without clipping; the other sheets use the default 10px margin. Bounds are recorded per frame in each `manifest.json`.

Slots are idle, preparation, two alternate casts, power preparation, power release, held charge and finale. All actor fallback paths remain image-based. Theater V6 is retained unchanged except for shared finale-pose priority during an active hold and a visual-only encore when a milestone occurs during an empty encounter.

## Effects

`tools/art/export-world-fx.mjs` exports critical hit, rune circle, contact zap and mana burst in three exact palette ramps. Twelve palette derivatives live in `public/assets/pixelfx-v5/{present,future,fantasy}/`. Source: pixelfx commit `a84159688af3ca37a4be05a0d422b94451b2e24e`, MIT, copyright 2026 Patch and Hugo Duprez; complete license at `public/assets/pixelfx-v5/LICENSE.txt`. Only the selected world's additional four sheets are preloaded, shared by note and battle renderers. Failed loads are evicted for retry on reselect/restart; successful sheets stay cached.

Distinct original Canvas drawing code supplies rooftop equalizer packets/stereo rings/speaker impacts, orbital rails/diamond notes/hologram arrays, and fantasy musical arrows/harp strings/star blossoms. These are not reskinned copies of reference-game assets. No changes to recordings, judgment windows, attack damage or input ownership are included.
