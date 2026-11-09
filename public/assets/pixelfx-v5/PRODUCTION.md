# Musical Feedback V5

Source: https://github.com/patch-gg/pixelfx

Commit: `a84159688af3ca37a4be05a0d422b94451b2e24e`.

Copyright (c) 2026 Patch and Hugo Duprez. MIT; complete notice in `LICENSE.txt`.

Exported from the existing local Windows runtime, not a new browser dependency or generated image model. Reproduce with `node tools/art/export-feedback-v5.mjs` at the application root. The script retains exact palette arrays and invokes upstream `tools/render.mjs --sheet --no-actor`. Preview contact sheets are included for visual review; the application requests only PNG sheets and JSON metadata.

| Event | Upstream effect | Palette / behavior |
| --- | --- | --- |
| Normal hit | `impacts/hit-spark` | Native warm gold, small directional spark |
| Perfect hit | `impacts/crit-hit` | Cyan/ice-white radial star and ring |
| Hold sustain | `arcane/rune-circle` | Cyan rune loop; active holding state only |
| Hold completion | `lightning/zap-hit` | Cyan electrical knot; contact origin, no ground offset |
| Every 8 successful judgments | `arcane/mana-burst` | Magenta burst; skip 0.22s gather phase on impact |
| Boss defeated | `spawn/poof` | Native lavender/gray dissolution with gold stars; secondary magenta victory flourish |

All frames use upstream pivot and frame rate, nearest-neighbor sampling and cached shared images. Runtime classification, recoil, limited battle-only shake, hold-tail marks, musical projectiles and victory banner are original integration code. Normal/perfect/hold do not shake the view. No music or judgment-clock hit-stop is applied. Reduced-motion uses fixed sprite poses, no recoil/shake and no moving hold-tail marks. Effects never translate the note canvas or its hit targets.

Reference game code/art/audio is not embedded in these sheets or the implementation. The accompanying research report separates actual REA static evidence from source inspection and original design recommendations.
