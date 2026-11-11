# Three music-led charts for the 14-song library

Keep the shipped audio, audio clock, tempo timebase, excerpts and listening breaks. Build charts from source events rather than moving old notes onto a grid.

- [x] Export exact source events from the three synth scores and attack/contour estimates from the eleven shipped acoustic excerpts. Record which observations are estimated.
- [x] Make the library use a shared selector: first beats, first beats plus bass, then pitch contour and rhythmic attacks. Do not play inferred pitches over recordings.
- [x] Connect the level selector, difficulty-aware enemy health and estimated bar guides derived from the recordings. Keep legacy chart data for the other game views.
- [x] Verify all 42 charts against their sources, section limits, spacing, holds and full combat simulations. Check selection and gameplay on desktop and mobile.

Checks: all three exporter `--check` runs, 437 unit tests and build passed. Playwright started all 42 charts across 1440px and 320px viewports and checked their first drawn lanes. A full mobile Can-Can beginner run observed one intentional miss, energy 100 to 94 to 97, four enemies defeated and 5/5 after quiz review. No public deployment was changed.
