import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { hexToOklab, oklabDistance } from './oklab';

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

describe('oklabDistance', () => {
  it('is zero for a color against itself', () => {
    expect(oklabDistance(parseHex('#6b6a3f'), parseHex('#6b6a3f'))).toBeCloseTo(0, 10);
  });

  it('is symmetric', () => {
    const a = parseHex('#a89c78');
    const b = parseHex('#b58a5a');
    expect(oklabDistance(a, b)).toBeCloseTo(oklabDistance(b, a), 10);
  });

  it('separates the warm neutrals that RGB distance confuses', () => {
    const khaki = parseHex('#a89c78');
    const tan = parseHex('#c9ad86');
    const navy = parseHex('#1f2a44');
    expect(oklabDistance(khaki, tan)).toBeLessThan(oklabDistance(khaki, navy));
  });
});
