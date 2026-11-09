# Character Placement V4

## Cause

Battle characters used one hard-coded foot baseline (246/320) for every illustration. The preview independently placed sprites with CSS left/right percentages over a covered/cropped background. Those two coordinate systems disagreed, put feet on the rooftop's front wall, and could clip actors on portrait screens.

## Fix

`src/quest/sceneLayout.ts` is the shared authoring coordinate system (480x320). Feet anchors and background-specific floor planes now feed battle drawing, sprite destinations and responsive preview projection.

| World | Hero X | Enemy X | Floor Y |
| --- | ---: | ---: | ---: |
| Theater | 116 | 360 | 274 |
| Rooftop | 100 | 370 | 224 |
| Orbital stage | 112 | 364 | 212 |
| Forest | 112 | 356 | 226 |

Rooftop feet align with the two painted note tiles instead of the front ledge. Hovering spirits/drones have explicit lift values, while their shadows remain on the floor. Projectiles, skill impacts, damage text and hero level effects follow the new anchors. Boss size and maximum recoil remain inside the scene.

The preview uses the same background projection for art and actors. Portrait viewports safely constrain actor centers; the vertical crop keeps the floor visible. Compact preview captions are hidden so they cannot cover the cast; the selected title remains in the music list/control strip.

## Verification

- Nine new regression tests first failed without the shared layout module, then passed. They cover every world/stage, foot anchors, boss recoil, hovering creatures and five responsive aspect ratios.
- Actual Battlefield fixture rendered 16 encounters (four worlds x four stages), 32 actor instances representing all20 unique characters. Every destination rectangle and foot anchor was checked.
- Production browser checked 16 preview combinations: four worlds at1440x900,390x844,320x740,2560x720. No clipped actors or detached foot anchors; no browser errors.
- Actual app gameplay screenshot checked at1440x900. Captures/report: `output/note-knights/placement-v4/`.
- Music, charts, judging and input behavior were not changed.
