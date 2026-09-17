import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { blockLabel, nearestName, PALETTE } from './palette';

describe('PALETTE', () => {
  it('has 18 colors with unique names and hexes', () => {
    expect(PALETTE).toHaveLength(18);
    expect(new Set(PALETTE.map((c) => c.name)).size).toBe(18);
    expect(new Set(PALETTE.map((c) => c.hex)).size).toBe(18);
  });
});

describe('nearestName', () => {
  it('names every palette color as itself', () => {
    for (const c of PALETTE) {
      expect(nearestName(c.hex)).toBe(c.name);
    }
  });

  it('is stable under a small perturbation', () => {
    // A camera read is never exact. A two-step nudge must not rename the color.
    for (const c of PALETTE) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(c.hex.slice(i, i + 2), 16)) as [number, number, number];
      const nudged = parseHex(
        `#${[r + 2, g - 2, b + 2]
          .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
          .join('')}`,
      );
      expect(nearestName(nudged)).toBe(c.name);
    }
  });
});

describe('blockLabel', () => {
  it('reads slot then color name, as the handoff notes require', () => {
    expect(blockLabel('top', parseHex('#a9bfd4'))).toBe('Top: Pale blue');
  });
});

describe('nearestName discrimination', () => {
  it('uses OKLab distance, not RGB Euclidean distance', () => {
    // This color sits between Olive and Camel: RGB(145, 123, 70), HSL(42°, 35%, 42%).
    // It is lighter and warmer than Olive (hue 59°, L 33%), so Camel is the
    // perceptually correct match.
    // RGB: Euclidean distance to Olive is 42.2, to Camel is 43.8 (tie, picks Olive).
    // OKLab: distance to Olive is 0.0819, to Camel is 0.0772 (picks Camel).
    // RGB incorrectly picks the darker, greener option.
    const testHex = parseHex('#917b46');
    expect(nearestName(testHex)).toBe('Camel');
  });
});
