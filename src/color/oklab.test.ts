import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { hexToOklab, hexToOklch, oklabDistance } from './oklab';

describe('hexToOklab', () => {
  it('puts white at L=1 with no chroma', () => {
    const [l, a, b] = hexToOklab(parseHex('#ffffff'));
    expect(l).toBeCloseTo(1, 3);
    expect(a).toBeCloseTo(0, 3);
    expect(b).toBeCloseTo(0, 3);
  });

  it('puts black at L=0', () => {
    expect(hexToOklab(parseHex('#000000'))[0]).toBeCloseTo(0, 3);
  });
});

describe('hexToOklch', () => {
  it('reports no chroma for a pure grey', () => {
    expect(hexToOklch(parseHex('#8a8a8a')).c).toBeCloseTo(0, 5);
  });

  it('carries the same lightness as hexToOklab', () => {
    const hex = parseHex('#4a6285');
    expect(hexToOklch(hex).l).toBeCloseTo(hexToOklab(hex)[0], 10);
  });

  it('reports hue in degrees, wrapped into 0 to 360', () => {
    for (const hex of ['#a4522d', '#1f2a44', '#2f4a3a', '#6b2733']) {
      const { h } = hexToOklch(parseHex(hex));
      expect(h, hex).toBeGreaterThanOrEqual(0);
      expect(h, hex).toBeLessThan(360);
    }
  });

  it('puts rust in the warm half and navy in the cool half', () => {
    expect(hexToOklch(parseHex('#a4522d')).h).toBeLessThan(130);
    expect(hexToOklch(parseHex('#1f2a44')).h).toBeGreaterThan(130);
  });
});

describe('oklabDistance', () => {
  it('is zero for a color against itself', () => {
    expect(oklabDistance(parseHex('#6b6a3f'), parseHex('#6b6a3f'))).toBeCloseTo(0, 10);
  });

  it('is symmetric', () => {
    const a = parseHex('#a89c78');
    const b = parseHex('#b58a5a');
    expect(oklabDistance(a, b)).toBeCloseTo(oklabDistance(b, a), 10);
  });

  it('produces smaller distances for perceptually closer colors', () => {
    // Sanity check: OKLab distance decreases with perceptual similarity.
    // Khaki and Tan are perceptually similar warm neutrals; Navy is perceptually distant.
    // This assertion holds under both RGB and OKLab distance metrics.
    // The metric-regression test in palette.test.ts is where they differ.
    const khaki = parseHex('#a89c78');
    const tan = parseHex('#c9ad86');
    const navy = parseHex('#1f2a44');
    expect(oklabDistance(khaki, tan)).toBeLessThan(oklabDistance(khaki, navy));
  });
});
