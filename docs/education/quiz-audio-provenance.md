# Recorded Listening Quiz Samples, v1

## Status And Exception

Six real acoustic recordings are present in `public/assets/audio/quiz-v1/` and
exported as `INSTRUMENT_ASSETS: InstrumentAsset[]` by
`src/quest/bank/audioAssets.ts`. No oscillator, soundfont renderer, or
Philharmonia recording is used.

**Accepted technical exception:** the piano is 6.637029 s, longer than the
original 2-4 second target. The parent accepted this duration to preserve the
complete recorded decay/release; no external approval is required. The pack
remains below the 2 MB WAV budget. The five
short-note files are exactly 2 s, including added trailing digital silence;
they are not two-second sustained notes. Do not describe this pack as six
2-4 second sustained examples. A strict verification command below deliberately
fails on the piano exception.

The cello recording is a cello **section**, not a solo cello. Bowed string
examples are spiccato and wind examples are staccato. These can demonstrate
short-note timbre, but do not replace sustained samples when a listening
activity requires a continuous tone. Natural tuning has not been corrected.

## License Verified Before Use

- Primary producer repository: [Sam Gossner / Versilian Studios, VSCO 2 CE](https://github.com/sgossner/VSCO-2-CE).
- Recording source commit: `440300901dfe9275fd84e0b7763af1f8443ae62e`.
- [CC0-1.0 dedication at that commit](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/LICENSE),
  Git blob `670154e3538863b2d9891fd5483160fbdfc89164`.
- The build downloads and validates this license blob before any recording.
  The unchanged dedication is redistributed as `LICENSE-VSCO-2-CE.txt`.
- [Producer README and recording/cutting credits](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/README.md).
- [Legacy Readme](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/Readme.txt)
  permits all-purpose use, requests credits, and discourages direct sample
  sales. The actual repository dedication is CC0, without an attribution or
  noncommercial restriction. This pack keeps the requested credits anyway.

Credit: VSCO 2 CE / Versilian Studios; recorded by Sam Gossner & Simon Dalzell;
sample cutting by Elan Hickler / Soundemote. These are library-level credits;
the source does not establish an individual performer for every chosen file.

## Exact Sources And MIDI Roots

All following paths are relative to the pinned recording-source commit above.
Each is a single recorded note. No different pitch or repeated notes were
spliced into an output.

| ID | Exact source path | Articulation | rootMidi |
| --- | --- | --- | ---: |
| piano | `Keys/Upright Nr1/UR1_C4_pp_RR2.wav` | Upright, pp, RR2 | 60 (C4) |
| flute | `Woodwinds/Flute/stac/LDFlute_stac_C4_v3_rr1.wav` | Staccato, layer 3, RR1 | 72 (C5) |
| violin | `Strings/Solo Violin/spic/LLVln_spic_C3_v2_rr1.wav` | Solo spiccato, layer 2, RR1 | 60 (C4) |
| trumpet | `Brass/Trumpet/stac/Sum_SHTrumpet_stac_C3_v2_rr1.wav` | Unmuted staccato, layer 2, RR1 | 60 (C4) |
| clarinet | `Woodwinds/Clarinet/stac/DCClar_stac_D3_v2_rr1_sum.wav` | Staccato, layer 2, RR1 | 62 (D4) |
| cello | `Strings/Cello Section/spic/spic_C3_v1_RR1.wav` | Section spiccato, layer 1, RR1 | 60 (C4) |

MIDI uses scientific pitch notation, C4 = MIDI 60. Source filenames do not use
a consistent octave convention. Roots come from the producer's numeric
`pitch_keycenter` regions at official SFZ commit
`6dd651d55dde97fd4028699be9d4481f26917891`, not by guessing from names:

| ID | Official SFZ file | Matching sample region |
| --- | --- | --- |
| piano | [VSUpright1.sfz](https://github.com/sgossner/VSCO-2-CE/blob/6dd651d55dde97fd4028699be9d4481f26917891/VSUpright1.sfz) | `UR1_C4_pp_RR1.wav`, root 60; selected RR2 is the same note, verified acoustically |
| flute | [FluteStac.sfz](https://github.com/sgossner/VSCO-2-CE/blob/6dd651d55dde97fd4028699be9d4481f26917891/FluteStac.sfz) | Exact chosen filename, root 72 |
| violin | [SViolinSpic.sfz](https://github.com/sgossner/VSCO-2-CE/blob/6dd651d55dde97fd4028699be9d4481f26917891/SViolinSpic.sfz) | Exact chosen filename, root 60 |
| trumpet | [TrumpetStac.sfz](https://github.com/sgossner/VSCO-2-CE/blob/6dd651d55dde97fd4028699be9d4481f26917891/TrumpetStac.sfz) | Exact chosen filename, root 60 |
| clarinet | [ClarinetStac.sfz](https://github.com/sgossner/VSCO-2-CE/blob/6dd651d55dde97fd4028699be9d4481f26917891/ClarinetStac.sfz) | Exact chosen filename, root 62 |
| cello | [CelloEnsSpic.sfz](https://github.com/sgossner/VSCO-2-CE/blob/6dd651d55dde97fd4028699be9d4481f26917891/CelloEnsSpic.sfz) | Exact chosen filename, root 60 |

The unchanged hash-verified SFZ evidence is included in
`public/assets/audio/quiz-v1/source-mappings/`. The build copies numeric roots
only; it does not apply upstream SFZ tuning, envelopes, gain, or loops.

`public/assets/audio/quiz-v1/manifest.json` records exact recording and mapping
commits, paths, Git blob SHA-1s, input and output SHA-256s, original frame counts,
padding frame counts, RMS, peak, pitch estimates, credits, and license links.

## Processing

1. Fetch immutable license and source blobs; verify Git blob SHA-1 including
   Git's `blob <length>\0` header. Cache outside the source tree.
2. Decode/downmix with the installed ffmpeg to mono, 44100 Hz, signed PCM16.
   The mono conversion is ffmpeg's normal stereo downmix, not peak normalization.
3. Retain **every decoded source frame**, including the original attack,
   release, and room tail. Zero source frames are trimmed. No fades, filtering,
   time stretching, pitch correction, looping, or synthesis are applied.
4. Append zeros only when the complete source is shorter than 2 s. This pads
   the container duration without stretching or fabricating the acoustic note.
5. Write canonical little-endian RIFF/WAVE PCM16 headers with Python `wave`.
6. Set metadata playback `gain = 0.6 / output peak`, rounded to five decimals.
   Samples themselves remain unnormalized. Runtime velocity, polyphony, and
   master volume must still be respected; these gains can exceed 1 because
   upstream recordings are quiet. A single full-velocity note peaks near 0.6.

No sample-rate change is needed for these 44100 Hz inputs. Bit-depth conversion
is needed for the 24-bit flute/cello sources. ffmpeg version differences can
change quantization at the least-significant bit; the shipped output hashes
are the authoritative checksum for this build.

## Measurements

WAV total: **1,467,650 bytes**, below the 2,000,000-byte budget. All six are
mono PCM16 at 44100 Hz. Full-file RMS includes the recorded decay and any
trailing zero padding; it is not a perceptual loudness measurement.

| ID | Seconds | Bytes | RMS dBFS | Estimated MIDI | Cents from nominal |
| --- | ---: | ---: | ---: | ---: | ---: |
| piano | 6.637029 | 585430 | -52.841 | 59.9574 | -4.26 |
| flute | 2.000000 | 176444 | -44.347 | 72.0738 | +7.38 |
| violin | 2.000000 | 176444 | -35.193 | 60.0223 | +2.23 |
| trumpet | 2.000000 | 176444 | -50.573 | 60.0458 | +4.58 |
| clarinet | 2.000000 | 176444 | -37.425 | 61.6163 | -38.37 |
| cello | 2.000000 | 176444 | -44.717 | 59.9086 | -9.14 |

Pitch is an independent early-note normalized-autocorrelation estimate. The
clarinet has a noticeably flat early transient; root 62 follows the official
mapping, not a claim of concert-perfect tuning. The checker accepts at most
65 cents from the documented root, detects octave errors, rejects silent or
clipped files, checks exact output hashes, validates WAV parameters and the
total size, and reports duration exceptions. This is numeric validation, not
a claim of human listening review, teacher validation, or browser playback testing.

## Leading Silence And Attack

Measured on the shipped mono PCM16 files: each onset is the time from the file
start to the first individual sample whose absolute amplitude reaches the
stated percentage of that file's peak. Attack is the interval between the
first 5% and 50% crossings, not a claim that the envelope rises monotonically.
All values below are milliseconds, before transposition and runtime envelopes.

| ID | 0.5% peak onset | 5% peak onset | 50% peak onset | Attack, 5% to 50% |
| --- | ---: | ---: | ---: | ---: |
| piano | 0.000 | 4.558 | 12.381 | 7.823 |
| flute | 0.181 | 11.519 | 35.283 | 23.764 |
| violin | 0.000 | 3.129 | 42.585 | 39.456 |
| trumpet | 0.068 | 3.107 | 92.653 | 89.546 |
| clarinet | 0.476 | 22.608 | 48.889 | 26.281 |
| cello | 0.227 | 1.088 | 39.229 | 38.141 |

These are amplitude-threshold measurements, not perceptual onset guarantees.
The lowest threshold can detect room noise, and instrument attacks differ.
No leading frames were removed to align these crossings.

## Educational Limitations

- Each instrument has one recorded pitch, not a multisampled keyboard.
  Playback-rate key transposition changes pitch, duration, attack, and timbre
  together. File duration and threshold times divide by
  `2 ** ((playedMidi - rootMidi) / 12)`; padding does not provide audible sustain.
  Playing the flute from root 72 at MIDI 60 doubles its attack and duration:
  its 5% onset becomes 23.039 ms and its 50% onset becomes 70.566 ms. This may
  suffice for rough relative-pitch examples but is not faithful timbre across
  the register; prefer pitches near each source root for timbre identification.
- The five non-piano recordings use short articulations. Two seconds of file
  duration includes silence and does not establish two seconds of sounding
  tone, even if the runtime schedules a two-beat event. These are not validated
  sustained-duration examples. Piano decay likewise is not a constant-level tone.
- Playback gains equalize peaks only, not RMS or perceptual loudness. No claim
  of loudness-matched timbre A/B comparison is made. Velocity, register,
  articulation, and the runtime envelope also affect perceived level.
- The pack has not been human-listening-reviewed or teacher-validated.
  Numeric integrity, pitch, and onset checks do not establish educational
  suitability or substitute for listening and classroom review.

## Rebuild And Verify

Use the already installed Python/numpy and ffmpeg. No package/service install:

```powershell
python tools/music/build_quiz_samples.py
python tools/music/build_quiz_samples.test.py
python tools/music/build_quiz_samples.py --verify
python tools/music/build_quiz_samples.py --verify --strict-duration
```

Build requires public HTTPS downloads from `raw.githubusercontent.com` and
uses a temporary hash-checked cache; `--cache PATH` overrides its location.
`--verify` is fully offline. `--strict-duration` intentionally exits nonzero
because it enforces the original 2-4 second target without the accepted piano
exception; that diagnostic is not an outstanding approval requirement. The builder
does not edit schema, content, runtime, package files, index exports, or git.
It writes WAVs, manifest, license, and mapping evidence only within its owned
public directory. Playback metadata in `audioAssets.ts` is kept explicit.

## Piano Alternative Audit

VSCO has an acoustic piano, so there is no missing-instrument substitution.
The parent accepted the 6.637029 s duration as a technical exception within
the total size budget. The shortest VSCO candidate inspected was the chosen
`UR1_C4_pp_RR2.wav`; its tail is not treated as removable silence merely to
meet the size/duration specification.

The other primary CC0 option investigated was
[Versilian VCSL](https://github.com/sgossner/VCSL/tree/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e),
with its [pinned CC0 dedication](https://github.com/sgossner/VCSL/blob/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/LICENSE)
verified before candidate downloads. Kawai
`Chordophones/Zithers/Grand Piano, Kawai/Sustains/GPiano_sus_C3_v1_rr1_Player.wav`
(13.459683 s), its C4 counterpart (10.024036 s), and Steinway
`Chordophones/Zithers/Grand Piano, Steinway B/NoSus/JHPiano_NoSus_Close_C4_vl2_rr1.wav`
(8.544127 s) did not solve the constraint. None is shipped. Release-only piano
samples were rejected because they lack the hammer attack. Electronic piano
and ambiguously recorded Freesound clips were not substituted.

The longer piano is the accepted source choice; replacing it or cutting its
release is not required. The duration remains explicit in the manifest and
measurements rather than being described as a 2-4 second recording.
