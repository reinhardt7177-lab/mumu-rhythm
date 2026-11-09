# Third-party Assets

## Current Fullscreen V3 Library

The current library exposes 14 titles: six trusted existing tracks and eight newly cleared acoustic recordings. This is ten additional selections beyond the earlier four-world library. New recordings, exact recording-license evidence, revision URLs, performers and edit notices are documented in `docs/music-expansion-v3.md` and `public/assets/audio/expansion-v3/provenance.json`; the in-game info dialog displays the selected recording's credit and license links.

The old Hungarian Dance derivative below is retained only for the legacy studio; it is **excluded from the current quest catalog** because the exact recording release could not be reliably cleared. Do not describe it as a newly cleared recording or re-expose it without evidence.

All current heroes and enemies use the four era-specific generated image atlases in `public/assets/art/actors-v3/`. There are four heroes and sixteen enemies. Sources, prompts and normalization notes: `public/assets/art/actors-v3/PRODUCTION.md`.

## Note Knights pixel effects

World attacks V7 adds three newly generated eight-pose hero atlases in `public/assets/art/world-attacks-v7/{present,future,fantasy}/hero.png`. Source IDs, complete built-in generation prompts and normalization are in `public/assets/art/world-attacks-v7/PRODUCTION.md`. Twelve pixelfx palette derivatives in `public/assets/pixelfx-v5/{present,future,fantasy}/` use the same pinned source and MIT notice as the existing sheets. New projectile paths, equalizers, speaker shapes, orbital arrays, harp strings and star effects are original Canvas code. Backgrounds, enemies, recordings and song credits are reused unchanged.

The theater V6 upgrade adds a newly generated transparent eight-pose conductor atlas at `public/assets/art/theater-v6/conductor.png`. Its built-in generation prompt, source and normalization process are retained in that folder's `PRODUCTION.md`. Four golden pixelfx palette derivatives are at `public/assets/pixelfx-v5/theater/`, under the same upstream MIT license as the V5 sheets. Existing enemy casts, recordings and other eras are unchanged by this upgrade.

The V5 feedback player additionally uses `impacts/hit-spark`, `impacts/crit-hit`, `arcane/rune-circle`, `lightning/zap-hit`, `arcane/mana-burst`, and `spawn/poof` from the same pixelfx commit below. These are offline-rendered sprite sheets, with original palettes changed to cyan and magenta for distinct judgment feedback. Provenance, reproduction and the complete license are bundled in `public/assets/pixelfx-v5/PRODUCTION.md` and `public/assets/pixelfx-v5/LICENSE.txt`. No pixelfx runtime dependency is downloaded by the browser. Character sprites now use the generated era-specific atlases in `public/assets/art/actors-v3/`; the musical projectiles remain original code drawings.

Bemuse and osu!mania were analyzed as design references only. No reference-game source, artwork, skin or music is bundled into this application. Actual bounded Bemuse REA evidence and separately labeled official source comparisons are documented in `docs/references-rhythm-fx-v5.md`; reference acquisitions and analyzer output remain in ignored `tmp/references-v5/`.

The pixel adventure originally used rendered `holy/smite` and `ui/level-up` sheets from [pixelfx](https://github.com/patch-gg/pixelfx), upstream commit `a84159688af3ca37a4be05a0d422b94451b2e24e`. Copyright 2026 Patch and Hugo Duprez, MIT. The full license is shipped at `public/assets/pixelfx/LICENSE.txt`. V5 retains `ui/level-up` for encounter transitions and replaces smite with tier-specific feedback.

The first playable chapter uses the Can-Can recording documented below. Its source page was checked on 2026-11-09 and explicitly lists public-domain dedication, redistribution and modification. Additional recordings must be checked individually; a public-domain composition alone does not establish permission for a recording.

## Performance recordings

The game uses edited excerpts of real performances of public-domain compositions. Source files are downloaded to the ignored `tmp/` directory; only the classroom-length OGG derivatives are distributed.

### Rondo alla Turca

- Performer: Eduardo
- Source: [IMSLP recording #111573](https://imslp.org/wiki/Piano_Sonata_No.11_in_A_major%2C_K.331%2F300i_%28Mozart%2C_Wolfgang_Amadeus%29)
- Recording license: Creative Commons Attribution 3.0
- Edit: approximately 8.26 seconds from the source, followed by a 68-second excerpt

### Can-Can from Orpheus in the Underworld

- Source collection: Musopen, mirrored by [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Offenbach_-_Orpheus_in_the_Underworld_-_Overture,_Can_Can_section.ogg)
- Recording license: public-domain dedication
- Edit: approximately 4.29 seconds from the source, followed by a 74-second excerpt

### William Tell Overture Finale

- Performer: United States Marine Corps Band, 2000
- Source: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Gioachino_Rossini,_William_Tell_Overture_(military_band_version,_2000).ogg)
- Recording status: public domain as a work of the United States federal government
- Edit: approximately 7:30.83 from the source, followed by a 74-second finale excerpt

### Hungarian Dance No. 5

- Performer: Kassia
- Source collection: Musopen, distributed by [Creazilla](https://prod.test.creazilla.com/media/audio/7955548/hungarian-dance-no.5)
- Recording license listed by the distributor: public domain / free for commercial use
- Edit: approximately 3.94 seconds from the source, followed by a 74-second excerpt

All four derivatives add a short gameplay lead-in and apply fades, filtering, peak limiting, and loudness normalization. They do not add a synthetic arrangement. Gameplay charts are original analysis data generated from the edited recordings with librosa.

## Artwork

The four-world redesign adds theater, rooftop and orbital backgrounds in `public/assets/art/worlds-v2/`, plus a shared ghost/golem/demon atlas at `public/assets/art/quest-v1/enemies.png`. Art is newly AI-generated and locally normalized; prompts and provenance are in `public/assets/art/worlds-v2/PRODUCTION.md`. Existing forest, bard and slime are reused.

The redesign bundles NeoDunggeunmo from the [official webfont repository](https://github.com/neodgm/neodgm-webfont). Copyright (c) 2021-2026 Eunbin Jeong (Dalgona.), reserved font name NeoDunggeunmo. The font is distributed under SIL OFL 1.1; full notice and license are bundled in `public/assets/fonts/NEODGM-LICENSE.txt` and accessible from game credits.

The Note Knights forest quality slice uses newly AI-generated art in `public/assets/art/quest-v1/`: a forest background, an eight-frame bard sheet and a four-frame slime sheet. The built-in image tool generated complete sheets; local processing preserves alpha and normalizes the shared scale and bottom-center anchor. Prompts and processing notes are in `public/assets/art/quest-v1/PRODUCTION.md`; originals are retained under `output/note-knights/source/`. Later encounters now use the shared generated monster atlas from the four-world redesign.

Note Knights uses `holy/smite` and `ui/level-up` sprite effects from pixelfx, under the MIT license. Copyright (c) 2026 Patch and Hugo Duprez. The license is distributed at `public/assets/pixelfx/LICENSE.txt`.

The V8 application includes original AI-generated song artwork in `public/assets/art/v8/`. The note stage and music-video panels are drawn at runtime with Canvas 2D, CanvasKit and WebGL2 (see `ASSET_PROMPTS.md`).

Stage depth is designed in Blender 5.x by `tools/art/blender/export_stage_geometry.py`, which exports numeric camera-projected geometry to `src/content/stageGeometry.generated.ts`. Blender is used as an offline authoring tool and is not distributed with the application; no rendered images are produced.

## CanvasKit

The optional GPU effects layer uses [CanvasKit](https://skia.org/docs/user/modules/canvaskit/), the WebAssembly build of Skia, through the `canvaskit-wasm` npm package.

- License: BSD-3-Clause
- Loaded only after the game screen starts
- The game continues with its Canvas 2D renderer when CanvasKit or WebGL is unavailable

## Original synth recording

Neon Run, Cloud Hop and Robot Parade are generated locally by `tools/music/build_synth_tracks.py` (scores in `tools/music/synth_tracks.py`). Their melodies are original scale-degree sequences written for this project, not arrangements of existing songs. They use no third-party samples or model output. The score, synthesis, arrangement, mix, gameplay chart, OGG, and M4A derivatives are original project assets.
