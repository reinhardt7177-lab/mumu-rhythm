# Musical Chart Pilot

Cloud Hop is the reference track: its exact lead and bass events are available from the arrangement that renders the shipped audio. Preserve the recording and the existing input modes. Add an independent difficulty selector only to this track. Other recordings need their own verified score or onset map before they can be converted.

- [x] Export the actual lead and bass events without changing the render order or assets.
- [x] Compile three progressive musical experiences: downbeat anchors, bass rhythm, and lead contour with room for accompaniment. Preserve the listening break and hold lengths.
- [x] Use the selected chart for play and combat. Distinguish accented beats and add a quiet pitch-matched response without changing the audio clock.
- [x] Verify source alignment, note ergonomics, encounter completion, and browser controls on desktop and touch.

Verification: 396 tests and the production build pass. The original rendered samples and legacy chart are bit-identical. Local browser playthroughs complete pulse (24 notes, keyboard), groove (96 notes, keyboard), and melody (132 notes, touch), all with 4/4 enemies and a corrected quiz score of 5/5. The touch run recorded 169 trusted taps and 8 hold-completion labels. Artifacts: `output/note-knights/world-journey/musical-{pulse,groove,melody}/`. This is not a public release.

Authoring rule: every playable note must cite an onset, pitch, and duration in the exact recording's score. Keep rests, accents, and phrase boundaries. Add difficulty through musical roles and subdivisions, not random extra lanes. Record which pitches share a lane and do not claim note-level accuracy for a grid inferred from a recording.
