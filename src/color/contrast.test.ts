import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { hslToHex } from './convert';
import {
  contrastOver,
  contrastRatio,
  needsBorder,
  readableForeground,
  relativeLuminance,
} from './contrast';

const PALETTE_HEXES = [
  '#1b1b1b', '#3d3d3f', '#8a8a8a', '#e6e5e2', '#f7f6f3', '#e9dfc9',
  '#1f2a44', '#4a6285', '#a9bfd4', '#2f4a3a', '#6b6a3f', '#a89c78',
  '#b58a5a', '#c9ad86', '#5a3e2e', '#6b2733', '#a4522d', '#c39a3a',
];

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance(parseHex('#000000'))).toBeCloseTo(0, 6);
    expect(relativeLuminance(parseHex('#ffffff'))).toBeCloseTo(1, 6);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black against white', () => {
    expect(contrastRatio(parseHex('#000000'), parseHex('#ffffff'))).toBeCloseTo(21, 4);
  });

  it('is symmetric', () => {
    const a = parseHex('#4a6285');
    const b = parseHex('#e9dfc9');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe('readableForeground', () => {
  it.each(PALETTE_HEXES)('reaches 4.5:1 on %s without a scrim', (value) => {
    const result = readableForeground(parseHex(value));
    expect(result.kind).toBe('direct');
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('fixes the three colors the prototype fails', () => {
    // The prototype's 0.35 threshold gives 3.13, 2.83 and 2.48 here.
    for (const [value, atLeast] of [['#8a8a8a', 5.3], ['#b58a5a', 5.9], ['#a89c78', 6.7]] as const) {
      expect(readableForeground(parseHex(value)).ratio).toBeGreaterThan(atLeast);
    }
  });

  it('holds 4.5:1 across the whole picker range, not just the palette', () => {
    for (let h = 0; h < 360; h += 15) {
      for (let s = 0; s <= 100; s += 20) {
        for (let l = 8; l <= 92; l += 4) {
          const result = readableForeground(hslToHex(h, s, l));
          expect(result.ratio).toBeGreaterThanOrEqual(4.5);
          expect(result.kind).toBe('direct');
        }
      }
    }
  });

  it('falls back to a scrim when asked for AAA, and the scrim delivers it', () => {
    // 7:1 is unreachable directly in the mid-luminance band.
    const result = readableForeground(parseHex('#8a8a8a'), { minRatio: 7 });
    expect(result.kind).toBe('scrim');
    expect(result.ratio).toBeGreaterThanOrEqual(7);
  });
});

describe('contrastOver', () => {
  it('reports a lower ratio than the opaque foreground', () => {
    const bg = parseHex('#8a8a8a');
    const fg = readableForeground(bg).color;
    expect(contrastOver(fg, bg, 0.8)).toBeLessThan(contrastRatio(fg, bg));
  });

  it('shows why the prototype caption at 0.8 opacity fails', () => {
    // Five palette colors drop under 4.5 at this alpha. This is the reason
    // the caption opacity is removed rather than kept.
    const bg = parseHex('#a4522d');
    const fg = readableForeground(bg).color;
    expect(contrastOver(fg, bg, 0.8)).toBeLessThan(4.5);
  });

  it('equals the opaque ratio at alpha 1', () => {
    const bg = parseHex('#1f2a44');
    const fg = readableForeground(bg).color;
    expect(contrastOver(fg, bg, 1)).toBeCloseTo(contrastRatio(fg, bg), 10);
  });
});

describe('needsBorder', () => {
  it('is true for colors that would vanish into the background', () => {
    expect(needsBorder(parseHex('#f7f6f3'))).toBe(true);
    expect(needsBorder(parseHex('#e9dfc9'))).toBe(true);
  });

  it('is false for colors that read against it', () => {
    expect(needsBorder(parseHex('#1f2a44'))).toBe(false);
    expect(needsBorder(parseHex('#a4522d'))).toBe(false);
  });
});
