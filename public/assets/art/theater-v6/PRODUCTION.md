# Theater V6 Conductor Animation

Generated with the built-in image tool on 2026-11-09. Reference: the existing top-row hero in `public/assets/art/actors-v3/past.png`, identity/palette only. Monsters and environments were not regenerated. Source: `exec-d1243619-8da2-4d8a-b014-7092c06932f0.png`, archived unchanged at `output/note-knights/theater-v6/source.png`.

## Prompt

Create a production-ready TRANSPARENT pixel art animation sprite sheet for the young theater conductor hero in the reference. Reference role: identity and palette ONLY: use the boy in the TOP ROW, ignore all monsters. Same tousled chestnut hair, gold-trimmed burgundy tailcoat, white cravat, dark trousers, gold baton, charming high-quality 16-bit RPG pixel art. Facing RIGHT in every frame. A precise uniform grid of FOUR COLUMNS by TWO ROWS (8 frames), landscape sheet. NO text, labels, borders, grid lines, shadows, backgrounds, floating musical particles or glow; genuine transparent alpha. Each cell has generous transparent margins; full body, feet never clipped, same character height and feet baseline in each cell. Keep dark outlines, clearly readable hands and baton. Eight distinctly different poses in row-major order: frame0 poised idle with baton down; frame1 anticipation with bent knees and baton pulled behind left shoulder; frame2 brisk right-handed forward baton flick with left foot planted; frame3 alternate upward flourish with left hand leading and coat swinging, different silhouette from frame2; frame4 powerful two-arm overhead preparation; frame5 strong wide forward conducting sweep with both arms open, coat tails flared; frame6 long-note charge pose holding baton vertically in front of chest with second hand supporting, knees slightly bent; frame7 triumphant finale conducting pose with baton high and free arm extended right. All frames are the SAME boy, same proportions, designed to animate coherently, not separate portraits. Crisp pixel clusters and restricted warm palette, no smooth painting. Compose exactly 4 columns x 2 rows with exactly one character centered per equal-sized cell.

## Runtime Preparation

`tools/art/build-theater-poses.mjs` extracts the equal source cells using alpha bounds, applies a single scale to all eight frames, and aligns the bottom foot mass to pivot (64,120). The resulting transparent `conductor.png` is 512x256, four columns, 128px cells. All occupied bounds are retained in `manifest.json`; nearest-neighbor sampling is used. This is AI-generated pixel-styled art, not a claim of hand-drawn historical sprites.

The new sheet supplies gameplay idle, preparation, alternating casts, strong preparation/release, hold charge and finale. The original atlas remains for theater enemies and menu preview; other eras keep their original cast. If the new sheet cannot decode, the existing image-based hero remains available, not a geometric placeholder.

## Golden Effects

Four existing pixelfx effects are recolored offline with `tools/art/export-theater-fx.mjs`: critical hit, rune circle, contact zap and mana burst. The exact burgundy/gold/ivory palette is stored in the script. Outputs are under `public/assets/pixelfx-v5/theater/`. These derivatives use the same upstream commit and MIT notice as `public/assets/pixelfx-v5/LICENSE.txt`, copyright 2026 Patch and Hugo Duprez. No pixelfx runtime simulation or network API is used during play.

Musical projectiles, outlined note glyphs, fan trajectories, staff ribbons, orbiting triads, organ-pipe impact silhouettes and the finale title are original Canvas drawing code. They are separate from the actor image and cannot shift the note hitline or change attack damage.
