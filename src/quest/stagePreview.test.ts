import { describe, expect, it } from 'vitest';
import { previewBeats } from './stagePreview';

describe('opening stage choreography', () => {
  it('gives the four worlds distinct phrases, using only the five game lanes', () => {
    const phrases = ['past', 'present', 'future', 'fantasy'].map(world => previewBeats(world, 132));
    expect(new Set(phrases.map(phrase => phrase.map(beat => beat.lane).join(','))).size).toBe(4);
    for (const phrase of phrases) expect(phrase.every(beat => beat.lane >= 0 && beat.lane < 5)).toBe(true);
  });
  it('fits the slowest performance in under five seconds without rushing the attacks', () => {
    const slow = previewBeats('past', 1), fast = previewBeats('past', 900);
    expect(slow.at(-1)!.at + .68).toBeLessThan(5);
    expect(fast[1].at - fast[0].at).toBeGreaterThan(.31);
  });
});
