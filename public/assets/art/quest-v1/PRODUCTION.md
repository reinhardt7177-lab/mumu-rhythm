# Starlight Forest Assets

Generated using the built-in image generation tool on 2026-11-09. Runtime assets are normalized from complete sheets, not independently generated frames. No third-party characters or franchises were requested.

## Prompt Set

- Forest: polished 16-bit side-view musical fantasy battle background, starlit emerald forest, turquoise creek, distant circular stone shrine, fireflies and gold stars, clear central arena, continuous mossy platform at approximately 78% height, 3:2 landscape, no characters, text or UI.
- Bard: transparent 4-column x 2-row sheet, eight frames of the same right-facing golden-haired musical bard with dark teal feathered cap, seafoam tunic, plum cape and golden eighth-note staff. Top row: four idle frames. Bottom row: windup, aim, release and recovery. Same proportions, bottom-center anchor, crisp pixel clusters, no scenery or labels.
- Slime: transparent 4-column x 1-row sheet, same emerald jelly with leaf sprout, tiny golden star and friendly face. Upright idle, squash, surprised stretch, surprised squash. Same bottom-center baseline, crisp pixel clusters, no scenery or labels.

## Processing

`tools/art/build-quest-assets.mjs` retains originals under `output/note-knights/source`, splits equal source cells, detects alpha bounds, applies ONE shared scale per sheet and anchors every frame at (64,120) in a 128px cell. Alpha is retained. Forest is exported as a 960x640 WebP. Runtime paths are local and need no external image hosting.

The generated art is pixel-styled, not a claim of manually authored historical 16-bit assets. Further art direction can refine animation consistency without changing the game clock or gameplay.
