# Recorded chart sources

Run `python -B tools/music/export_recorded_scores.py --check` from the repository root. Omit `--check` to regenerate `src/content/recordedScores.generated.ts`. The exporter uses the local FFmpeg, NumPy and SciPy installations. It reads only the exact shipped OGGs and the two existing generated chart objects; it does not download, rewrite or transcode assets on disk. The export includes each input file's SHA-256.

| Exact input under `public/assets/audio/` | Song BPM | Tactus per group | Tactus period (s) | Phase | Pulse / bass / lead / rhythm |
| --- | ---: | ---: | ---: | ---: | ---: |
| `v4/backing/can-can.ogg` | 185 | 2 | 0.319 | 0 | 99 / 306 / 269 / 126 |
| `v4/backing/turkish-march.ogg` | 129 | 2 | 0.469 | 0 | 62 / 234 / 268 / 36 |
| `v4/backing/william-tell.ogg` | 152 | 2 | 0.399 | 0 | 77 / 275 / 253 / 106 |
| `expansion-v3/bach-prelude.ogg` | 100 | 4 | 0.539 | 0 | 27 / 241 / 214 / 67 |
| `expansion-v3/beethoven-fifth.ogg` | 108 | 2 | 0.369 | 0 | 89 / 272 / 264 / 166 |
| `expansion-v3/morning-mood.ogg` | 100 | 2 | 0.768 | 0 | 41 / 254 / 249 / 190 |
| `expansion-v3/mountain-king.ogg` | 135 | 4 | 0.499 | 2 | 35 / 289 / 301 / 134 |
| `expansion-v3/borodin-scherzo.ogg` | 144 | 2 | 0.379 | 1 | 79 / 239 / 288 / 139 |
| `expansion-v3/brahms-tragic.ogg` | 132 | 2 | 0.439 | 1 | 73 / 265 / 270 / 151 |
| `expansion-v3/tchaikovsky-march.ogg` | 140 | 4 | 0.439 | 3 | 37 / 290 / 276 / 154 |
| `expansion-v3/bach-fugue.ogg` | 112 | 4 | 0.419 | 3 | 35 / 260 / 214 / 33 |

These are practical groups of tracked tactus (the recurring felt beat), not claims about the printed time signature. Phase is the zero-based accent class within each group, relative to the first beat tracked in that excerpt. The algorithm estimates a period from periodic attacks, follows the performed attack times with a tempo tolerance, and chooses the phase with the strongest average bass and broadband accents. Pauses can omit a pulse entirely. Beethoven's fermatas, accelerando in Mountain King, Morning Mood's soft entrances, and the fast Scherzo all make grouping approximate. William Tell, Borodin and Brahms have weak separation between their top accent phases; treat these as strong-beat estimates, not verified bar lines.

- **Pulse:** estimated bar-first or strong beat, with a measured attack near that beat; no pitch attached.
- **Bass:** measured low-register attack. MIDI is present only when a stable, rising spectral candidate separates from alternatives. An ambiguous but strong low attack stays `null`.
- **Lead:** a supported rising pitch candidate in the upper register, with a small preference for local continuity. This captures an estimated contour, not a separated melody stem; doubled octaves, piano arpeggios, orchestral counterlines and close simultaneous notes can be confused.
- **Rhythm:** broadband attack where no lead pitch passed the gate; always unpitched. Onset resolution is about 10 ms, not a guarantee of ±10 ms musical accuracy.

Beat = detected seconds from decoded sample zero × Song BPM ÷ 60. The baked-in count-in is part of that clock; there is no second offset or quantization to a nominal beat. The 100 ms duration is tap support, not a sustain estimate. Events whose full tap would cross a play boundary are omitted, as are all listening-window events.

Across the 25 play windows, the smallest counts are 10 pulse, 64 bass and 70 lead events. The latest source event in each role is within 1.74 s, 0.53 s and 0.72 s of every play-window end, respectively. All 11 tracks have both rising and falling lead estimates. As a sanity check, the early Bach prelude estimates recover MIDI 60, 64, 67, 72 and 76 in order. These checks measure candidate coverage and consistency; they do not substitute for listening or score-aligned transcription review.

Existing recording credits remain in [THIRD_PARTY_ASSETS.md](../../THIRD_PARTY_ASSETS.md), the [legacy source list](../../tools/build_real_music.py), and the [expansion provenance](../../public/assets/audio/expansion-v3/provenance.json). Nothing in the export changes recording credits or licenses.
