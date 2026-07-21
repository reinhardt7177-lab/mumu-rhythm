# Third-party Assets

## Melody transcriptions

The four gameplay melodies are adapted from the hand-transcribed public-domain repertoire in [appleweiping/cadenza](https://github.com/appleweiping/cadenza).

- Source code and transcription data: MIT License
- Compositions: public domain
- Used tracks: Rondo alla Turca, Can-Can, William Tell Overture, Hungarian Dance No. 5

The orchestration, dynamics, form, accompaniment and gameplay chart reductions in this project are new arrangements.

## GeneralUser GS

The backing tracks and chromatic hit-sound sprites are rendered with [GeneralUser GS](https://github.com/ad-si/GeneralUser), created by S. Christian Collins.

GeneralUser GS permits unrestricted private or commercial music creation and permits use in software projects. The SoundFont itself is downloaded to the ignored `tmp/` directory and is not redistributed in this repository. Only newly rendered OGG audio is included.

## FluidSynth

[FluidSynth](https://github.com/FluidSynth/fluidsynth) is used as an offline MIDI and SoundFont renderer by `tools/build_music.py`.

- Source license: LGPL-2.1
- FluidSynth binaries are downloaded to the ignored `tmp/` directory and are not distributed with the web application.

## Artwork

The four song artworks were generated specifically for this project from the prompts documented in `ASSET_PROMPTS.md`. They do not reproduce commercial rhythm-game artwork.
