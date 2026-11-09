# Music Expansion V3

Eight additional **real acoustic performance recordings**, checked 2026-11-09.
These are eight new titles, not duplicates of the existing catalog. The eighth
was authorized to let the parent exclude the uncleared legacy Hungarian Dance:
six trusted legacy songs plus eight new songs gives fourteen playable songs.
No existing catalog, world, actor, UI, audio asset, or shared credit document is modified.

## Integration

```ts
import { extraSongs, extraSongInfo } from "./content/extraSongs";
// Parent owns the merge: exclude the legacy Hungarian recording first.
const releasedSongs = [...legacySongs.filter((song) => song.id !== "hungarian-dance"), ...extraSongs];
const info = extraSongInfo[extraSongs[0].id];
// info.introduction, info.sourceUrl, info.license, info.performer, info.worldId
// Also: info.credit, info.recordingLicense, info.licenseUrl, info.chartType, info.changes
```

`extraSongs` is `Song[]`; the keyed metadata map is `Record<string, ExtraSongInfo>`.
`worldId` is a suggested theatrical setting, not a claim about a composer's era.
The parent may override it. All eight entries supply localized introductions and
listening missions, each with three quiz options and one correct `answerIndex`.

Assets: `public/assets/audio/expansion-v3/<id>.ogg` and `<id>.m4a`.
Chart module: `src/content/extraCharts.generated.ts`, export `extraCharts`.
Provenance: `public/assets/audio/expansion-v3/provenance.json` includes exact
download URLs, source page revisions, source SHA-1/SHA-256, output SHA-256,
recording-license rationale, excerpt offsets and edit durations.

| Stable ID | Work / Performer | Source Excerpt | Game Duration | Targets |
| --- | --- | --- | --- | --- |
| `bach-prelude` | Bach, Prelude in C major BWV 846 / Kimiko Ishizaka | 0.40-68.40s | 73.050s | 83 |
| `beethoven-fifth` | Beethoven, Symphony 5, I / Skidmore College Orchestra | 0.40-74.40s | 78.694s | 93 |
| `morning-mood` | Grieg, Morning Mood / Czech National Symphony Orchestra (Musopen Symphony Orchestra) | 0.20-70.20s | 75.050s | 91 |
| `mountain-king` | Grieg, In the Hall of the Mountain King / same orchestra | 55.00-131.00s | 79.806s | 116 |
| `borodin-scherzo` | Borodin, String Quartet 1, III / Musopen String Quartet | 0.20-70.20s | 73.583s | 145 |
| `brahms-tragic` | Brahms, Tragic Overture / Czech National Symphony Orchestra (Musopen Symphony Orchestra) | 0.20-74.20s | 77.886s | 84 |
| `tchaikovsky-march` | Tchaikovsky, Symphony 6, III / Musopen Symphony Orchestra | 410.00-484.00s | 77.674s | 68 |
| `bach-fugue` | Bach, Fugue in C minor BWV 847 / Kimiko Ishizaka | 0.20-70.20s | 74.536s | 125 |

The musical excerpts themselves run 68-76 seconds. Game files add an eight-beat
silent count-in and a 250ms tail. Both codecs are stereo, 48kHz. A 60ms entrance
fade and 1.8s exit fade smooth the excerpts. FFmpeg loudness normalization targets
-16 LUFS / -1.5dBTP; original tempo and pitch are preserved. Sources are released
Vorbis recordings except Borodin's lossless FLAC. Re-encoding does not restore
information absent from a lossy source. No oscillator, MIDI arrangement, or
sampled synthetic orchestra replaces these performances.

## Exact Recording Rights

Composition public-domain status alone was **not** used as recording clearance.
The licenses below are those attached to each exact audio file's own license
section, including explicit recording-specific sections where available. The
Commons site footer's general CC BY-SA text and structured-data CC0 notice are
not the licenses of the audio recordings.

| ID | Exact Audio Source / Recording License | Evidence |
| --- | --- | --- |
| `bach-prelude` | [Kimiko Ishizaka, BWV 846](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | File license expressly CC0; description and embedded author identify the pianist and 2015 release. |
| `beethoven-fifth` | [Skidmore College Orchestra, Symphony 5, I](https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor,_op._67_-_i._allegro_con_brio.ogg), worldwide PD dedication **and attribution permission** | Recording section separately identifies Skidmore College Orchestra as PD releaser, and additionally displays an [attribution-only permission](https://commons.wikimedia.org/wiki/Template:Attribution). Retain the full credit and source link to satisfy the stricter notice. |
| `morning-mood` | [Musopen - Morning](https://commons.wikimedia.org/wiki/File:Musopen_-_Morning.ogg), worldwide PD dedication by Musopen | Exact-file license names Musopen as releasing rights, with unconditional-use fallback. Description identifies the orchestra and commissioned Kickstarter project. |
| `mountain-king` | [Musopen - In the Hall Of The Mountain King](https://commons.wikimedia.org/wiki/File:Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg), worldwide PD dedication by Musopen | Exact-file license names Musopen as releaser; description identifies the commissioned live-instrument orchestra. |
| `borodin-scherzo` | [Borodin, Quartet 1, III (FLAC)](https://commons.wikimedia.org/wiki/File:Borodin_-_String_Quartet_No._1_in_A_major_-_III._Scherzo._Prestissimo_(Musopen_String_Quartet).flac), worldwide PD dedication by Musopen | Separate **Recording** section is PD-author / Musopen, distinct from the composition section. Description identifies quartet and 2012 recording. |
| `brahms-tragic` | [Brahms, Tragic Overture](https://commons.wikimedia.org/wiki/File:Brahms,_Tragic_Overture.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Exact audio-file license is CC0. Summary author field is unknown, but upload history names Musopen Symphony Orchestra and embedded audio author identifies Czech National Symphony Orchestra. Linked lossless counterpart identifies Musopen Symphony. |
| `tchaikovsky-march` | [Tchaikovsky, Symphony 6, III](https://commons.wikimedia.org/wiki/File:Tchaikovsky,_Symphony_No._6_in_B_minor,_Op._74,_%27Pathetique%27_-_III._Allegro_molto_vivace.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Separate **Recording** section explicitly CC0; composition PD is separately documented. Upload history identifies Musopen Symphony Orchestra; linked FLAC is from the Kickstarter collection. |
| `bach-fugue` | [Kimiko Ishizaka, BWV 847 Fugue](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_04_Fugue_No._2_in_C_minor,_BWV_847.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Exact-file license expressly CC0; description and embedded author identify Kimiko Ishizaka and the 2015 Open Well-Tempered Clavier release. |

For the worldwide Musopen dedications, [PD-author](https://commons.wikimedia.org/wiki/Template:PD-author)
is the relevant permission wording, not a Creative Commons license. PDM is only
a status mark, not a license grant. The recording pages supply the actual
dedication and fallback permission.

### Credit To Surface

Display the work title, `extraSongInfo[id].performer`, `license`, `sourceUrl`,
`licenseUrl`, and the edit notice in `changes` together on the parent credit
surface. At minimum retain this attribution for Beethoven:

> Beethoven, Symphony No. 5 in C minor, Op. 67, I. Allegro con brio.
> Performed by Skidmore College Orchestra. Source: Wikimedia Commons / Musopen.
> Recording: public-domain dedication and attribution permission.
> MUMU game edit: excerpt, fades, loudness normalization, count-in and encoding.

Link that credit to the exact source page above and its attribution permission.
No performer or orchestra endorses this game.

## Chart Method And Limits

These are **rhythmic onset charts**, not note-for-note melody transcriptions.
Installed Librosa computes spectral-flux onset strength and detects genuine
attacks from the exact normalized PCM master, with roughly 10ms frame spacing.
Targets preserve the recording's absolute event times; there is no time stretch
or fixed-grid quantization. Per-track thinning enforces 310-360ms minimum spacing.
Accents mark the upper quartile of retained onset strengths. Five-lane patterns
are deterministic and ergonomic, not pitch estimates. `midi: 60` exists solely
for the shared `Song` contract and must not be presented as an inferred note.

`bpm` is the nominal transport/beat-coordinate scale, not a claim that expressive
performances stay at a metronomic tempo. Onset seconds are converted into these
coordinates, so rubato and accelerando remain synchronized. `beatsPerBar` serves
the current two/four-beat UI; Morning Mood's original 6/8 is represented with
two compound pulses. Bar/beat metadata is not a scholarly score edition.

All targets are taps, deliberately without invented long-note durations. A short
200ms visual body does not imply the duration or pitch of an acoustic note.
The count-in, eight-second listening break (music seconds 22-30), and ending fade
are note-free. Listening sections are contiguous with play sections. Signal
detectors can miss soft attacks or favor accompaniment; onset error can include
detector latency in addition to the frame resolution. This is not a manually
annotated instrumental performance or a melody-learning score.

## Rebuild And Verify

No dependencies were installed. Existing dependencies used: Python, Librosa,
NumPy, SoundFile, FFmpeg/FFprobe, Windows curl. Run from the repository root:

```powershell
# Network is opt-in; requests are exclusively Wikimedia audio downloads.
python tools/music/expansion-v3/build.py --download
# Cached-source offline rebuild:
python tools/music/expansion-v3/build.py
# Offline output integrity / decode / duration / signal checks:
python tools/music/expansion-v3/build.py --verify
npm test -- src/content/extraSongs.test.ts
npx tsc --noEmit
```

Original downloads and intermediate WAVs are cached only in the new script's
gitignored `tools/music/expansion-v3/sources/`. They are not shipped to browsers.
All eight source SHA-1 values are pinned in the manifest; changed remote bytes
fail closed and require a new rights review. Output SHA-256 values are recorded
in provenance and checked offline. Codec/library versions can affect regenerated
binary hashes; installed tools are sufficient for the checked-in build.

Verification fully decodes all sixteen shipped files; checks 45-90s duration,
expected count-in timing, audible signal, finite samples, stereo 48kHz, peaks
below full scale, and output fingerprints. Peak checks use stereo samples so a
gain-adding mono downmix cannot create a false clipping failure. Vitest checks
eight stable IDs, complete license metadata, shipped paths, localized quizzes,
five-lane coverage, chart spacing/bounds and note-free listening breaks.

The final eight-track build passed all sixteen full-decode checks. Encoded
stereo peaks at 48kHz measured 0.842-0.873, below full scale. The sixteen audio
assets total 25,424,597 bytes (24.25MiB). Review was an author self-review; no separate
reviewer agent was available in this scoped task.

Runtime UI/catalog exposure belongs to the parent task. This scoped delivery
does not modify `songs.ts` or claim a browser playthrough of the parent's UI.

## Legacy Hungarian Dance Audit

The existing Kassia-derived Hungarian Dance is **not** one of these eight
deliverables. The current [Creazilla distributor page](https://prod.test.creazilla.com/media/audio/7955548/hungarian-dance-no.5)
names Kassia but links only the Musopen homepage, not a specific recording grant.
No performer-origin public-domain dedication or reuse license was verified in
this audit. [Musopen's FAQ](https://musopen.org/faq/) states that user uploads are
not individually reviewed for public-domain status. Do not present that legacy
recording as verified PD based only on the distributor label.

The [specific Musopen work page](https://musopen.org/music/51718-hungarian-dance-no-5/)
is a better work/source link than the distributor's homepage link, but no
performer-origin recording grant was verified there. It does not by itself
resolve clearance. Two alternate performances were located:

- [Fulda Symphonic Orchestra / Simon Schindler](https://commons.wikimedia.org/wiki/File:Johannes_Brahms_-_Ungarischer_Tanz_5_g-moll.ogg),
  recorded 2000-04-09, EFF Open Audio License v1. This is not PD. It requires
  retaining original attribution (including tags) and the license of derivative
  works. It was not downloaded or substituted.
- [Jason M. C., Han, piano](https://commons.wikimedia.org/wiki/File:Hungarian_Dances_-_No._5_in_F_Sharp_Minor_(Collections_in_piano)_JMC,Han.ogg),
  self-recorded 2019-05-23, CC BY-SA 4.0. This is not PD and requires attribution
  and share-alike handling for an edited derivative. It was not substituted.

The approved resolution avoids introducing these extra license obligations:
exclude `hungarian-dance` from the playable parent catalog and add the fresh CC0
`bach-fugue` instead. No legacy audio, chart, or credit file has been changed by
this expansion; removing the legacy asset from distribution is also the parent's
responsibility if it remains bundled despite being hidden in the UI.
