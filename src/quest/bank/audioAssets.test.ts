import { describe, expect, it } from 'vitest';
import manifestText from '../../../public/assets/audio/quiz-v1/manifest.json?raw';
import { INSTRUMENT_ASSETS } from './audioAssets';

const manifest = JSON.parse(manifestText) as {
  samples: { id: string; rootMidi: number; gain: number }[];
};
const ids = ['piano', 'flute', 'violin', 'trumpet', 'clarinet', 'cello'].sort();

describe('recorded instrument asset contract', () => {
  it('exports exactly the six instrument IDs without duplicates', () => {
    expect(INSTRUMENT_ASSETS.map(asset => asset.id).sort()).toEqual(ids);
    expect(manifest.samples.map(sample => sample.id).sort()).toEqual(ids);
  });

  it('keeps every playback gain finite, positive, and at most 50', () => {
    for (const asset of INSTRUMENT_ASSETS) {
      expect(Number.isFinite(asset.gain), asset.id).toBe(true);
      expect(asset.gain, asset.id).toBeGreaterThan(0);
      expect(asset.gain, asset.id).toBeLessThanOrEqual(50);
    }
  });

  it('matches the registry MIDI roots and playback gains', () => {
    for (const asset of INSTRUMENT_ASSETS) {
      const sample = manifest.samples.find(item => item.id === asset.id);
      expect(sample, asset.id).toBeDefined();
      expect(asset.rootMidi, asset.id).toBe(sample?.rootMidi);
      expect(asset.gain, asset.id).toBe(sample?.gain);
    }
  });
});
