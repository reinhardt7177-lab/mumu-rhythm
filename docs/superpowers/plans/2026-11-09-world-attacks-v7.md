# Three World Attacks V7

**Goal:** Extend the approved theater hybrid sprite/pixelfx approach to rooftop, orbit and fantasy without changing judgment, input or damage.

**Approved Scope:** User requested three remaining worlds with their own character attack poses and combo effects. Preserve theater V6 and shared lane feedback. No new engine, songs, scoring or deployment.

**Architecture:** Reuse the verified 0/8/24/48 combo bands and 64-hit finale timing. A pure world profile defines names, effect IDs and converging trajectories. A separate world renderer draws three newly generated eight-pose atlases plus distinct musical effects. Cache sprite playback and preload only the selected world's palette sheets; await visual readiness before starting the music.

## Direction

- Rooftop: keytar girl; alternating key strikes, power-chord strum, held chord and finale jump/strum. Cyan/coral/lemon equalizer packets, speaker shockwaves, pulsing city sound system.
- Orbit: silver-haired space musician; alternating synth-baton casts, two-arm power release, beam charge and constellation finale. Ice-cyan/magenta orbiting notes, rail traces, angular hologram arrays.
- Fantasy: elven lyrist; alternating plucks, drawn resonant chord, charged string and star-song finale. Gold/lilac/leaf-green musical arrows, curling harp strings, petals and star constellations.

## Tasks

- [x] Generate and normalize three alpha eight-pose sheets with shared foot pivots; inspect every sheet and record prompts/provenance.
- [x] Add failing pure profile/trajectory/identity tests; implement world-specific profiles and renderer with bounded effects and reduced motion.
- [x] Export twelve cached palette derivatives and connect theme-specific note/hold/combo/boss playback with selected-world loading.
- [x] Integrate battlefield routing and names while preserving theater and single damage arrival.
- [x] Run unit/build, focused review, all-world desktop/mobile/reduced-motion galleries, hold lifecycle, three full songs and theater regression. Keep local preview; stop fixture server afterwards.

## Ledger and Evidence

- Normalized all24 poses. Orbit's wide scarf/baton uses a2px cell margin instead of10px, with every bound retained inside128px cells.
- Review fixed failed-preload cache poisoning; actual browser503 retry restores the critical-hit sheet. Successful sheets remain deduplicated.
- Full-song evidence exposed missed64-hit finales while enemy HP was0. Added a tested zero-damage visual encore, independent of Combat/projectile queues. A single pose selector now prioritizes finale over active/released hold visuals while preserving input state.
- 151 tests/20files and production build pass. Eight gallery modes, three native-touch hold lifecycles, loading/cache checks, two complete rounds of three songs and theater input lifecycle regression executed. Latest clears show all8 hero frames in each world,4/4 kills andquiz3/3. See `docs/world-attacks-v7-verification.md` for exact results and limits.

## Constraints

- No full-screen flashes, note-canvas translation, input hit-stop or random musical chords over recordings.
- Every projectile voice must converge on the original enemy at 0.32s; visual count does not multiply damage.
- Clear/reset/paused source ownership from V6 remains untouched.
- Retain original actor images as decode-failure fallback; do not replace actors with geometric stand-ins.
- Effects are finite, cached and bounded; no per-frame image generation or particle simulation dependency.
