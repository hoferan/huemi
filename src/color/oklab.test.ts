import { describe, expect, it } from 'vitest';
import { isHex, parseHex } from '../model/hex';
import { hexToRgb } from './convert';
import {
  hexToOklab,
  hexToOklch,
  oklabDistance,
  oklabToRgb,
  rgbToOklab,
  withLightness,
} from './oklab';
import { PALETTE } from './palette';

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

  it('spaces a step near black wider than the same step near white', () => {
    // The property that makes this metric worth having. Both pairs are 16 RGB
    // units apart on every channel, so Euclidean RGB scores them identically;
    // OKLab lightness is steep at the dark end and shallow at the light end, so
    // the dark pair is the one that reads as a real difference.
    //
    // This is also why colorName exempts neutrals from NAME_MAX_DISTANCE: the
    // same steepness puts pure black 0.222 away from Black.
    const darkStep = oklabDistance(parseHex('#000000'), parseHex('#101010'));
    const lightStep = oklabDistance(parseHex('#efefef'), parseHex('#ffffff'));
    expect(darkStep).toBeGreaterThan(lightStep * 2);
  });
});

describe('rgbToOklab', () => {
  it('agrees with hexToOklab, which is now built on it', () => {
    expect(rgbToOklab([31, 42, 68])).toEqual(hexToOklab(parseHex('#1f2a44')));
  });

  it('puts white at lightness 1 and black at 0', () => {
    expect(rgbToOklab([255, 255, 255])[0]).toBeCloseTo(1, 4);
    expect(rgbToOklab([0, 0, 0])[0]).toBeCloseTo(0, 4);
  });
});

describe('oklabToRgb', () => {
  it('round-trips every palette color to within one step per channel', () => {
    for (const { name, hex } of PALETTE) {
      const rgb = hexToRgb(hex);
      const back = oklabToRgb(rgbToOklab(rgb));
      back.forEach((v, i) => expect(Math.abs(v - rgb[i]!), name).toBeLessThanOrEqual(1));
    }
  });

  it('clamps a color outside sRGB instead of returning NaN', () => {
    const rgb = oklabToRgb([0.5, 0.4, -0.4]);
    for (const v of rgb) {
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});

describe('withLightness', () => {
  const denim = parseHex('#4a6285');

  it('leaves a color alone at zero', () => {
    expect(oklabDistance(withLightness(denim, 0), denim)).toBeLessThan(0.005);
  });

  it('moves OKLab lightness by the delta and nothing else much', () => {
    const [l0, a0, b0] = hexToOklab(denim);
    const [l1, a1, b1] = hexToOklab(withLightness(denim, 0.1));
    expect(l1 - l0).toBeCloseTo(0.1, 2);
    expect(Math.hypot(a1 - a0, b1 - b0)).toBeLessThan(0.01);
    expect(hexToOklab(withLightness(denim, -0.1))[0]).toBeCloseTo(l0 - 0.1, 2);
  });

  // The slider's full range applied to colors already at or near the end of
  // lightness it pushes toward: the result has to stay inside sRGB.
  it.each(['#f7f6f3', '#1b1b1b', '#ffffff', '#000000'])(
    'stays a valid hex at the ends for %s',
    (value) => {
      for (const delta of [-0.15, 0.15]) {
        const out = withLightness(parseHex(value), delta);
        expect(isHex(out)).toBe(true);
      }
    },
  );
});
