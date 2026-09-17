import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { hexToRgb, hslToHex, rgbToHex, rgbToHsl } from './convert';

describe('hexToRgb', () => {
  it('splits a hex into channels', () => {
    expect(hexToRgb(parseHex('#1f2a44'))).toEqual([31, 42, 68]);
  });
});

describe('rgbToHex', () => {
  it('round-trips with hexToRgb', () => {
    const hex = parseHex('#a89c78');
    expect(rgbToHex(hexToRgb(hex))).toBe(hex);
  });

  it('clamps out-of-range channels rather than overflowing', () => {
    expect(rgbToHex([-10, 300, 128])).toBe('#00ff80');
  });
});

describe('rgbToHsl', () => {
  it('reports zero saturation for a grey', () => {
    const [, s] = rgbToHsl(hexToRgb(parseHex('#8a8a8a')));
    expect(s).toBeCloseTo(0, 5);
  });

  it('reports a red hue near zero', () => {
    const [h] = rgbToHsl([255, 0, 0]);
    expect(h).toBeCloseTo(0, 5);
  });
});

describe('hslToHex', () => {
  it('round-trips through rgbToHsl for every palette-like colour', () => {
    for (const value of ['#1f2a44', '#a4522d', '#e9dfc9', '#2f4a3a']) {
      const hex = parseHex(value);
      const [h, s, l] = rgbToHsl(hexToRgb(hex));
      expect(hslToHex(h, s, l)).toBe(hex);
    }
  });
});
