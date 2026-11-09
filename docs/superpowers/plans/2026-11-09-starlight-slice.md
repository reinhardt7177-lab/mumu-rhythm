# Starlight Forest Production Slice

**Goal:** Replace the first encounter's geometric placeholders with coherent generated pixel art and synchronize visible impacts without changing the music clock or judgment.

**Architecture:** Retain Canvas2D, the five-lane rhythm input, existing orchestral recording and educational ending. Normalize generated atlases offline. Combat queues damage on song time; rendering consumes actual impact events.

**Tech Stack:** TypeScript, Canvas2D, Vite, Vitest, generated PNG/WebP assets, existing pixelfx.

## Approved Design

Modern 16-bit storybook fantasy: a golden-haired musical bard, emerald star slime and starlit woodland. Clear rhythm panel, richer battle panel. First encounter is the quality target; later enemies retain their current art until a separate production pass. No additional songs, deployment or framework migration in this slice.

## Tasks

- [x] Produce a forest background, eight-frame bard atlas and four-frame slime atlas. Retain originals, prompts and normalized frame metadata.
- [x] Add failing combat tests for delayed damage, target identity across transitions, idle targets, reset safety and final-song settlement. Keep immediate hit API compatible with existing tests.
- [x] Implement song-time projectile scheduling, impact events and completion flush. Render hit response only after arrival.
- [x] Replace first encounter art, add cast animation, recoil, musical trails, restrained ambient particles and pixelfx skill impact. Keep rhythm canvas stationary.
- [x] Preserve aspect ratio, add meaningful input feedback and a matching illustrated start dialog. Honor reduced-motion settings.
- [x] Run unit tests and production build. Browser-test desktop/mobile start, keyboard/touch, holds, pause, full clear and quiz; inspect captured frames and asset failures.

## Quality Gates

- Sprite cells share one scale and bottom-center anchor; no clipping or opaque background.
- All battle event timing uses song seconds, never wall-clock timers.
- Pending attacks cannot damage the next enemy after their target dies.
- Pending final attacks settle before results; pause freezes pending visuals.
- No layout overflow at 390 x 844, no stretched characters, no battle shake applied to notes.
- Asset-loading failures retain a playable fallback.

## Production Ledger

- Generated three source images with built-in image generation, no external service installation.
- Full animation sheets generated together; original source geometry remains available for further art refinement.
- Ruling: keep later encounters' existing art for this bounded quality slice; avoid presenting this as a complete four-stage art overhaul.
- Verification: `npm run build` passed. `npm test -- --pool=threads --maxWorkers=1`: 60/60 tests passed. Default fork workers encounter sandbox-specific Windows temporary file isolation; no game-code workaround was added.
- Browser: actual music output peak 128, mean frame interval 16.65ms / p95 16.8ms on this test desktop, boss clear 4/4 at 89% collection, quiz 3/3. Mobile 390x844 has scrollWidth 390; a held touch scored 626. No browser or asset errors in the smoke run.
- QA correction: restart assertion originally ran before the next animation frame; wait for the rendered reset state rather than immediately reading stale HUD text.
