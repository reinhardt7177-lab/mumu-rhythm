# Falling-Bar Rhythm Runtime Audit

## Scope and Evidence Boundary

- Audited and changed only `src/engine/game.ts`, `src/core/judge.ts`, their existing tests, `src/quest/noteTrack.ts`, the new `noteTrackGeometry.ts` helper and `noteTrack.test.ts`, and this report.
- Read the relevant REA, systematic-debugging, TDD, and completion-verification skills. No REA MCP tools are registered in this session. No REA package installation, readiness/provider setup, MCP configuration change, or REA Evidence record was produced.
- This is ordinary complete-source debugging plus actual Playwright/Edge runtime observation, not binary decompilation or REA-provider analysis. Source evidence and browser observations must not be described as REA-generated Evidence.
- No changes to main, worlds, battlefield, styles, content, assets, dependencies, or dist; no deployment or commit. Parent owns layout, music, actors, default challenge selection, and full application integration.

## Root Causes and Fixes

1. **Head top and center used different coordinates.** At the music timestamp the old renderer placed the head top at y=330, its actual center at 334.5, and the selection center at 334. `noteTrackGeometry.ts` now defines the center, head rectangle, hold body, and common dimensions. Rendering and spatial selection consume that same rectangle. A 38x10 head is centered exactly on y=330 at its beat, with lane centers at 24, 72, 120, 168, and 216. The visible judgment line is centered on the same y.
2. **Default approach mismatch.** Rendering defaulted to 3 seconds while game input defaulted to 3.2 seconds. `DEFAULT_APPROACH_SECONDS` now supplies 3.2 to both. Position is `330 - (noteTime - songTime) / approach * 310`, rounded once for pixel alignment. Between timestamps, center rounding is at most half a logical pixel.
3. **Independent touch bounds crossed lane boundaries and retained consumed targets.** Touch padding is now derived from the actual head rectangle and constrained to its lane. Selection filters live completed/missed flags, rejects hidden canvases and off-track coordinates, and scales CSS coordinates into the same logical track space. The renderer also scales to actual backing-canvas dimensions. `targetAt` still returns only `{ id, lane, x, y }` or `undefined`; `draw` and `feedback` signatures are unchanged.
4. **Already-hit holds blocked lane input.** Held heads previously stayed in the nearest-head candidate list, then rejected input after selection. New head candidates exclude hit notes; valid 120ms hold reconnects are selected explicitly before new heads, while expired reconnects cannot hide an eligible head. Both direct-note and lane input use the event's audio timestamp, never the last rendered frame, and each press samples that mapping once.
5. **Holds auto-completed 150ms before the musical tail.** Automatic success now waits until the actual tail. The existing 150ms release tolerance remains explicit: releasing within the tail grace succeeds once, earlier releases allow 120ms reconnect, and expired reconnects miss once. A future-note loop break also prevented early explore holds behind other unhit notes from being updated; this is now a skip rather than termination.
6. **Challenge accepted substantially early taps.** Challenge now uses symmetric +/-200ms GOOD bounds, with PERFECT +/-80ms and GREAT +/-150ms. Explore retains explicit early visible-note selection throughout the approach period. Nonfinite timestamps are rejected. Nanosecond numerical tolerance avoids rejecting exact input boundaries after floating-point subtraction.
7. **MISS with combo zero looked like a successful combo burst.** `feedback(MISS)` now displays MISS and does not spawn success particles. Successful multiples of eight still retain existing feedback.

## Verification

The original five focused tests passed too little behavior. New tests first reproduced 16 concrete failures before production fixes; final focused coverage is 31 tests in three files, including all five lane centers, timing boundaries, stale-frame input, backing/CSS scaling, consumed targets, hold completion/release/reconnect, and explore behavior.

Final commands:

```text
npm test -- src/engine/game.test.ts src/core/judge.test.ts src/quest/noteTrack.test.ts
3 test files passed; 31 tests passed.

npm test
12 test files passed; 101 tests passed.

npx --no-install tsc --noEmit
Exit 0; no diagnostics.
```

Vitest's sandboxed workers initially could not read transformed temporary modules (ENOENT). The passing test runs used the authorized unsandboxed command execution, without configuration changes. A transient parent-owned missing `extraSongs` module blocked an earlier full run; the final combined test and type-check runs above both passed after parent integration.

Actual browser checks used the already bundled Playwright package and already installed Edge, without downloading a package or browser. On this repo's local Vite server, startup produced the expected MUMU title and canvases without observed page errors. A controlled in-browser fixture imported the served, real `NoteTrack` module and used real Canvas drawing, mouse clicks, and touchscreen taps at desktop 1440x900 and mobile 390x900 viewports:

- Backing canvas: 480x720, displayed at 240x360 logical/CSS pixels.
- Actual head-color pixels: y=650 through 669 in backing pixels, geometric center y=660, hence logical center y=330.
- Unobscured judgment-line pixel: RGBA `[255, 227, 154, 255]`.
- Spatial query, real mouse pointer input, and real touch pointer input each returned `{ id: 'tap', lane: 0, x: 24, y: 330 }` at both viewports.

This fixture verifies live renderer/input geometry, not an end-to-end full-song audio playthrough. No production bundle was rebuilt for this audit.

## Integration Notes and Residual Risks

- Parent should explicitly pass `challenge` into both `game.start` and `track.draw`. The engine's existing default `explore` remains backward compatible; deliberate explore early tap-to-pop is preserved.
- Conventional challenge controls should route both keyboard and touch lane presses to `pressLane(lane, event.timeStamp)`. Use `targetAt` plus `pressNote(id, event.timeStamp)` for deliberate explore selection. `targetAt` is a spatial query of the last painted image, not a timing judge; never decide eligibility using a cached GameSnapshot. Direct input and lane input share timing windows, but direct selection still intentionally names a specific note rather than silently retargeting another note in that lane.
- Retain the returned hold `noteId` for the matching key/pointer and call `releaseNote` on release/cancel. Pointer capture, keyboard repeat suppression, focus loss, and multi-pointer ownership belong to parent main and were not changed or fully audited here.
- Parent currently returns early on MISS before calling `track.feedback`. Call `feedback` before that return to expose corrected MISS presentation.
- Fullscreen layout, actual key/button DOM alignment, audio-device/output-latency calibration, full-song keyboard/touch playthroughs, and focus/pause/multitouch behavior remain parent combined-QA responsibilities. No claim is made that these were end-to-end verified by the controlled renderer fixture.
