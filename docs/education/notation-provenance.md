# Notation Software And Font Provenance

Served credit entry: `/assets/notation-licenses/NOTICE.txt`.
Only license/notice copies were added; fonts, package files, runtime, and
notation rendering code were not edited. No dependencies were installed.

## Installed Assets

The installed `node_modules/vexflow/package.json` identifies VexFlow 5.0.0.
Its `./bravura` ESM export resolves to
`build/esm/entry/vexflow-bravura.js`. That entry imports and loads these three
embedded WOFF2 faces from `build/esm/src/fonts/`:

| Module | Face | Font version | License | Local notice |
| --- | --- | --- | --- | --- |
| `bravura.js` | Bravura | 1.392 | OFL-1.1 | `bravura-embedded-notice.txt` |
| `academico.js` | Academico Regular | 0.902 | OFL-1.1 | `academico-regular-embedded-notice.txt` |
| `academicobold.js` | Academico Bold | 0.902 | OFL-1.1 | `academico-bold-embedded-notice.txt` |
| VexFlow software | Notation renderer | 5.0.0 | MIT | `vexflow-MIT.txt` |

All notice filenames above are under `public/assets/notation-licenses/`.
The software MIT notice alone does not cover the embedded font software.
Other fonts present in the npm package are not imported by this entry; this
record does not claim to audit a future change to another VexFlow entry.

## Primary Sources And Exact Identity

- [Official VexFlow 5.0.0 release source](https://github.com/vexflow/vexflow/tree/8879d095b29b14dad1f605e0b24b2f1acf1b1e78).
  The unchanged installed npm `LICENSE` is copied as `vexflow-MIT.txt`.
- [Official VexFlow-fonts repository](https://github.com/vexflow/vexflow-fonts/tree/b2bc3a6070225e4d395966b36de76c36a9429b1c),
  commit `b2bc3a6070225e4d395966b36de76c36a9429b1c`.
  Its font package metadata identifies `@vexflow-fonts/bravura` 1.0.2 and
  `@vexflow-fonts/academico` 1.0.1, both authored by Steinberg Media Technologies
  GmbH and licensed OFL-1.1. These package versions differ from font versions.
- [Steinberg's official Bravura repository](https://github.com/steinbergmedia/bravura)
  confirms the font author's distribution and OFL license. Its current notice
  has a newer copyright date; it was not substituted for the bundled version.
- [Official Academico distribution README](https://github.com/vexflow/vexflow-fonts/blob/b2bc3a6070225e4d395966b36de76c36a9429b1c/academico/README.txt)
  identifies Academico 0.902 as installed by Steinberg Dorico. No separate
  Steinberg Academico repository was assumed. The actual bundled font's own
  Steinberg copyright and complete OFL text provide direct additional evidence.

The installed data-URI payloads were decoded in memory and inspected with
already available Python `fontTools`/Brotli, without writing new font files.
Their Git blob hashes match the pinned official repository
tree exactly, not merely their family names:

| Face | Official repository path | WOFF2 bytes | Git blob SHA-1 |
| --- | --- | ---: | --- |
| Bravura | `bravura/bravura.woff2` | 247200 | `b2257d55c6995b53e67d3196789715d51999a36c` |
| Academico Regular | `academico/academico.woff2` | 22704 | `e0ff3010a9d685be900893c17e4ac750a160d1d3` |
| Academico Bold | `academico/academico-bold.woff2` | 23496 | `8e5121224353888d9b8a95a6e7c88a0c24d7d77a` |

Decoded WOFF2 SHA-256:

```text
Bravura          5c25278c208ca455dc7c3c0c95d833e134aca6d740a023767af50d0dfa06ef82
AcademicoRegular 363caf009818b9cebc7a2644d96b5dc10a20d3b5e557afdb4fb1a9a53d57e329
AcademicoBold    575c2e30fcf7dd9363e49890644b2ed23b6b518c9866aadb5370d470473297b6
```

## Notice Copies And Copyright Dates

The three `*-embedded-notice.txt` files contain the complete unchanged Unicode
text of each font's Windows English `name` table copyright record: name ID 0,
platform ID 3, language ID `0x0409`. Each includes the complete OFL 1.1 text.
UTF-8 is used for the copied text without modifying its copyright characters.

Bravura's embedded record states 2021; Academico Regular states 2022; Academico
Bold's copyright record states 2020. Bold's name ID 13 licensing record instead
states 2022 and is byte-for-byte identical, after UTF-8 encoding, to Regular's
copied full notice. Both dates/texts are therefore preserved in the public
notices, not inferred or rewritten.

Additional unchanged distribution notices were downloaded from the exact
official paths below, with Git blob hashes verified:

- [Bravura LICENSE.txt](https://github.com/vexflow/vexflow-fonts/blob/b2bc3a6070225e4d395966b36de76c36a9429b1c/bravura/LICENSE.txt)
  copied as `bravura-OFL-1.1.txt`; blob
  `2ef86a39593a42e3971fb88314ed7d2b748d4ef4`; copyright 2019, Reserved Font Name Bravura.
- [Academico LICENSE.txt](https://github.com/vexflow/vexflow-fonts/blob/b2bc3a6070225e4d395966b36de76c36a9429b1c/academico/LICENSE.txt)
  copied as `academico-OFL-1.1.txt`; blob
  `18c0d60b6aeffb303b4fb73f11ac25237528122f`; copyright 2022, Reserved Font Name Academico.

## Redistribution

Keep the MIT software copyright/permission notice and all font copyright/OFL
notices with the distributed application. OFL permits embedding/bundling with
software under its conditions; it does not make the font MIT or CC0. Its
conditions include no standalone font sale, retention of notices, reserved-name
restrictions for modified fonts, no unauthorized endorsement, and keeping the
font software under OFL. Documents rendered using the fonts are not required
by OFL to adopt the font license. The copied complete licenses govern.

The parent can link `/assets/notation-licenses/NOTICE.txt` from credits and
ship the whole directory. Deployment and credit UI edits are outside this
task; the local notice copies and embedded-font identity were verified here.
