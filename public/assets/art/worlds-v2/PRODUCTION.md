# Four Musical Worlds

Created on 2026-11-09 with the built-in image generation tool. These are production game backgrounds, not screenshots or UI mockups. Original PNGs are retained under `output/note-knights/source/`. Browser assets are 960x640 WebP derivatives produced by `tools/art/build-quest-assets.mjs` using nearest-neighbor resizing.

## Shared Direction

Crisp modern 16-bit pixel clusters, an orthographic side-view battlefield, landscape 3:2 composition, clear central area for combatants around 22% and 74% horizontal position, horizontal platform near 76% image height, no characters, no text, no UI, no logos, no blur or vector shapes. Keep the scenery bright and welcoming for primary school pupils. Existing forest, bard and slime are reused from `../quest-v1/`.

## Prompt Set

### Past / Can-Can

19th-century Parisian toy theater at evening. Ruby velvet curtains, pearl and gold balconies, candlelit chandeliers, midnight-blue star-painted backdrop, golden lyre carvings, coral and aqua ornaments. Broad horizontal wooden stage for musical combat, detailed architecture, theatrical warm illumination.

Raw source: `exec-254f389b-bdc2-4d98-9a60-ce001a450a75.png`.

### Present / Cloud Hop (Korean title: 구름 점프)

Cheerful contemporary rooftop music garden. Sky-blue afternoon with ivory pixel clouds, coral and jade apartment buildings, distant blue tram, planters and a small boombox at the far edge. Sunlit pale-stone rooftop walkway, sunflower-yellow accents and building cutaway below.

Raw source: `exec-e4169c79-86b5-49f2-99d6-9667e7bd6850.png`.

### Future / Neon Run

Orbital concert station. Glass windows reveal a turquoise planet and distant orbital city. Pearl and jade arches, coral-magenta LED strips, equalizer pillars at the edges, horizontal cyan-trimmed metal platform and mechanical cutaway below. Turquoise, pearl, raspberry and electric-yellow palette.

Raw source: `exec-14153025-e117-4052-bf89-011c389a5b83.png`.

### Shared Monster Sheet

Transparent 3-column x 3-row atlas. Row one: lavender sheet-music ghost with gold note hat. Row two: mossy turquoise and terracotta golem with a golden treble-clef jewel. Row three: raspberry musical demon king with ivory horns, note crown, plum cape and conductor baton. Columns are idle, breathing, hurt. Left-facing, friendly, full body, shared bottom-center anchors within each 128px runtime cell. Original sheet generated together; no independent frame generation.

Raw source: `exec-3a7c3be2-6f42-42a9-8b5e-efcc830d1bf9.png`. Runtime atlas: `../quest-v1/enemies.png`.

## Pixel Font

NeoDunggeunmo is bundled from the official `neodgm/neodgm-webfont` repository. Source: https://github.com/neodgm/neodgm-webfont

Copyright (c) 2021-2026 Eunbin Jeong (Dalgona.), reserved font name NeoDunggeunmo. SIL Open Font License 1.1; full license is included at `/assets/fonts/NEODGM-LICENSE.txt` and linked in the game's credits.

Bundled font SHA256: `0C0CA9CD73F692A5DA5D7FB39737902AA9EA312537237779972A9D81EF0A33BF`.
