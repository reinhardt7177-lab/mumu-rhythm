import type { InstrumentAsset } from './types';

const commit = '440300901dfe9275fd84e0b7763af1f8443ae62e';
const source = `https://github.com/sgossner/VSCO-2-CE/blob/${commit}`;
const common = {
  credit: 'VSCO 2 CE / Versilian Studios; recorded by Sam Gossner & Simon Dalzell; sample cutting by Elan Hickler / Soundemote',
  license: 'CC0-1.0',
  licenseUrl: `${source}/LICENSE`,
};

// Complete acoustic recordings, not synthesized substitutes. Piano retains its
// 6.64-second release; details and hashes are in quiz-audio-provenance.md.
export const INSTRUMENT_ASSETS: InstrumentAsset[] = [
  { ...common, id: 'piano', url: '/assets/audio/quiz-v1/piano.wav', rootMidi: 60, gain: 28.53527,
    sourceUrl: `${source}/Keys/Upright%20Nr1/UR1_C4_pp_RR2.wav` },
  { ...common, id: 'flute', url: '/assets/audio/quiz-v1/flute.wav', rootMidi: 72, gain: 9.79123,
    sourceUrl: `${source}/Woodwinds/Flute/stac/LDFlute_stac_C4_v3_rr1.wav` },
  { ...common, id: 'violin', url: '/assets/audio/quiz-v1/violin.wav', rootMidi: 60, gain: 3.24275,
    sourceUrl: `${source}/Strings/Solo%20Violin/spic/LLVln_spic_C3_v2_rr1.wav` },
  { ...common, id: 'trumpet', url: '/assets/audio/quiz-v1/trumpet.wav', rootMidi: 60, gain: 11.02681,
    sourceUrl: `${source}/Brass/Trumpet/stac/Sum_SHTrumpet_stac_C3_v2_rr1.wav` },
  { ...common, id: 'clarinet', url: '/assets/audio/quiz-v1/clarinet.wav', rootMidi: 62, gain: 3.99366,
    sourceUrl: `${source}/Woodwinds/Clarinet/stac/DCClar_stac_D3_v2_rr1_sum.wav` },
  { ...common, id: 'cello', url: '/assets/audio/quiz-v1/cello.wav', rootMidi: 60, gain: 9.29589,
    sourceUrl: `${source}/Strings/Cello%20Section/spic/spic_C3_v1_RR1.wav` },
];
