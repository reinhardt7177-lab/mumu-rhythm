# Theater Touch V6 Implementation Plan

**Goal:** Make every lane press immediately tangible and turn theater combo progress into distinct animated musical attacks.

**Approved Design:** The user chose new character attack sprites plus code/pixelfx, first for the theater. Input glow is independent of judgment. Combo tiers are 0-7, 8-23, 24-47 and 48+, with an accent every 8 and a special 64-hit arrival. No copied reference assets, new engine, damage multiplier or altered music clock.

**Architecture:** A source-aware lane feedback state handles key/touch down/up and a short press impulse without scoring. Pure theater attack profiles select sprite poses and golden projectile paths from the existing judged combo. The battlefield layers new transparent pose assets, code-drawn staves/notes and the existing cached pixelfx sheets. Other eras retain their existing cast and attack rendering.

**Tech Stack:** TypeScript, existing Canvas2D/WebAudio/Vite, offline normalized generated sprites, cached pixelfx sheets.

## Tasks

- [x] Add regression tests for lane response independent of hits, multiple input sources, release/reset and exact combo-tier boundaries; implement small feedback/profile modules.
- [x] Integrate immediate keyboard/touch light, colored key travel, hitline flare and sustained hold; clear input on pause/home/blur without changing judgment geometry.
- [x] Produce and inspect a transparent theater attack atlas with distinct preparation, alternating casts, strong attack and charge poses; normalize consistent feet anchors.
- [x] Integrate tier-specific golden attacks, accented impact layers, long-note charging and 64-hit finale; keep damage single and reaction time tied to arrival.
- [x] Run unit/build checks, focused code review, full-song keyboard clear, input/hold/multi-touch and desktop/mobile/reduced-motion screenshot comparisons. Preserve local preview, do not deploy.

## Verification Focus

- Empty presses light the correct lane but cannot score or attack; auto-repeat does not retrigger.
- Releasing one of two inputs on the same lane does not turn off the other; blur/pause/restart clears every source.
- An active hold retains its light without auto-awarding success after an early release.
- Tiers and visual variants do not change damage, flight arrival, hit windows or another world's actor atlas.
- Light effects remain local to the receptor/lane; full-screen flashes and note-canvas shake are forbidden. Reduced motion keeps legibility without oscillation.

## Ledger

- Approved: hybrid sprite/code approach, theater first, 2026-11-09.
- Existing issue: lane glow currently follows successful-note pulse only, key press appearance is gray, hero has only preparation/cast frames and one projectile pattern.
- Visual iteration: stagger projectile voices horizontally and outline their glyphs, because aligned gold notes merged into the golden stage background. Tier two gets orbiting triads, tier three gets an organ-pipe silhouette, and 64-hit accents get a brief labeled finale. Hold completion keeps its own identity even on combo accents.
- Review: fixed active-hold ownership when a second same-lane input pops a tap, including its spatial target constraint. Pausing and completing now redraw a non-illuminated note frame after input cleanup. Actual-main native-touch regression confirms a held note completes after the keyboard owner releases; brightness returns from 239/250 to baseline 111 on pause/completion. Reviewer rechecked with no remaining findings.
- Final verification: 138 tests across 18 files and production build pass. Final full-song keyboard run: 99% collection, 105 max combo, 4/4 kills, audio peak 196/255 and quiz 3/3; the earlier pass achieved 100%/114. Actual asset draws verified all eight new frames and all four golden pixelfx variants in normal/reduced-motion galleries. Local preview only, no deployment.
