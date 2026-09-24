import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import {
  blockLabel,
  colorName,
  describeColor,
  NAME_MAX_DISTANCE,
  nearestColor,
  nearbyColors,
  PALETTE,
} from './palette';
import { hexToOklab } from './oklab';

describe('PALETTE', () => {
  it('has 18 colors with unique names and hexes', () => {
    expect(PALETTE).toHaveLength(18);
    expect(new Set(PALETTE.map((c) => c.name)).size).toBe(18);
    expect(new Set(PALETTE.map((c) => c.hex)).size).toBe(18);
  });
});

describe('nearestColor', () => {
  it('names every palette color as itself', () => {
    for (const c of PALETTE) {
      expect(nearestColor(c.hex).color.name).toBe(c.name);
    }
  });

  it('is stable under a small perturbation', () => {
    // A camera read is never exact. A two-step nudge must not rename the color.
    for (const c of PALETTE) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(c.hex.slice(i, i + 2), 16)) as [
        number,
        number,
        number,
      ];
      const nudged = parseHex(
        `#${[r + 2, g - 2, b + 2]
          .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
          .join('')}`,
      );
      expect(nearestColor(nudged).color.name).toBe(c.name);
    }
  });
});

describe('blockLabel', () => {
  it('reads slot then color name, as the handoff notes require', () => {
    expect(blockLabel('top', parseHex('#a9bfd4'))).toBe('Top: Pale blue');
  });

  it('carries the description through when no palette name fits', () => {
    // The one place the cutoff reaches a user today.
    expect(blockLabel('top', parseHex('#00ff00'))).toBe('Top: bright green');
  });
});

describe('nearestColor metric regression', () => {
  it('detects if the distance metric switches away from OKLab', () => {
    // A color sitting between two palette entries where the metrics differ.
    // This is a near-tie on both metrics — either answer is defensible — but it pins
    // the current OKLab-based implementation as the regression baseline.
    // RGB: Olive 42.2, Camel 43.8 (3.8% gap). OKLab: Camel 0.0772, Olive 0.0819 (6.1% gap).
    // If the metric accidentally reverts to RGB Euclidean, this test fails.
    const testHex = parseHex('#917b46');
    expect(nearestColor(testHex).color.name).toBe('Camel');
  });
});

describe('nearestColor', () => {
  it('returns the entry itself at distance zero for a palette color', () => {
    const result = nearestColor(parseHex('#a9bfd4'));
    expect(result.color.name).toBe('Pale blue');
    expect(result.distance).toBe(0);
  });

  it('reports the distance it measured, not just the winner', () => {
    // Yellow is far from every entry in this muted palette. The old API threw
    // this number away, which is how "#ffff00 is Cream" got out.
    const result = nearestColor(parseHex('#ffff00'));
    expect(result.distance).toBeGreaterThan(0.15);
  });
});

describe('describeColor', () => {
  // Hue words are anchored on the OKLab hue of the sRGB primaries and
  // secondaries, measured: red 29, orange 56, yellow 110, green 142, cyan 195,
  // blue 264, purple 296, magenta 328. Band edges sit between the anchors.
  it.each([
    ['#ff0000', 'bright red'],
    ['#ff8800', 'bright orange'],
    ['#ffff00', 'bright yellow'],
    ['#00ff00', 'bright green'],
    ['#00ffff', 'pale teal'],
    ['#0000ff', 'bright blue'],
    ['#8800ff', 'bright purple'],
    ['#ff00ff', 'bright pink'],
  ])('describes %s as %s', (hex, expected) => {
    expect(describeColor(parseHex(hex))).toBe(expected);
  });

  it('reaches for lightness when the color is not saturated enough to be bright', () => {
    expect(describeColor(parseHex('#2a1f14'))).toBe('dark orange');
    expect(describeColor(parseHex('#d9c9f0'))).toBe('pale purple');
  });

  it('gives a bare hue word when the color is neither bright, dark nor pale', () => {
    // 0.155 from the palette, so this is reachable through colorName rather
    // than a shape only describeColor can be handed.
    expect(describeColor(parseHex('#00a05a'))).toBe('green');
    expect(colorName(parseHex('#00a05a'))).toBe('green');
  });

  it('names a neutral by lightness alone, because its hue is noise', () => {
    // hexToOklch documents that hue is meaningless as chroma approaches zero.
    expect(describeColor(parseHex('#000000'))).toBe('black');
    expect(describeColor(parseHex('#8a8a8a'))).toBe('grey');
    expect(describeColor(parseHex('#ffffff'))).toBe('white');
  });
});

describe('colorName', () => {
  it('uses the palette name when the input is close enough to one', () => {
    expect(colorName(parseHex('#a9bfd4'))).toBe('Pale blue');
    // 0.102 away, inside the cutoff: still Mustard, not "bright orange".
    expect(colorName(parseHex('#ff8800'))).toBe('Mustard');
  });

  // The four inputs from issue #37. Each one snapped to a hue-implausible
  // palette name before the cutoff existed.
  it.each([
    ['#00ff00', 'Cream', 'bright green'],
    ['#ffff00', 'Cream', 'bright yellow'],
    ['#00ffff', 'Light grey', 'pale teal'],
    ['#ff00ff', 'Grey', 'bright pink'],
  ])('describes %s rather than calling it %s', (hex, _wrong, expected) => {
    expect(colorName(parseHex(hex))).toBe(expected);
  });

  it('keeps the palette name for a neutral however far it measures', () => {
    // Pure black is 0.222 from Black, well past the cutoff, because OKLab
    // lightness is steep at the dark end. There is no hue to get wrong here,
    // so the name holds: a camera reading a black shirt in shadow lands here.
    expect(nearestColor(parseHex('#000000')).distance).toBeGreaterThan(NAME_MAX_DISTANCE);
    expect(colorName(parseHex('#000000'))).toBe('Black');
    expect(colorName(parseHex('#ffffff'))).toBe('White');
  });

  // Real camera reads from the #20 tuning photos. Each is a neutral whose
  // nearest palette entry was a color, so it got a hue it does not have.
  it.each([
    ['#bdb8b4', 'Pale blue', 'Light grey'],
    ['#94998b', 'Khaki', 'Grey'],
    ['#635a56', 'Olive', 'Charcoal'],
  ])('names the neutral read %s by a neutral, not %s', (hex, _wrong, expected) => {
    expect(colorName(parseHex(hex))).toBe(expected);
  });

  it('never gives a color a neutral name', () => {
    // The lit crinkled aubergine trousers from the same photos, hue 25 at
    // chroma 0.052. Its nearest entry is Grey.
    expect(nearestColor(parseHex('#a37a76')).color.name).toBe('Grey');
    expect(['Black', 'Charcoal', 'Grey', 'Light grey', 'White']).not.toContain(
      colorName(parseHex('#a37a76')),
    );
  });

  it('keeps every palette color and a camera-sized nudge inside the cutoff', () => {
    for (const c of PALETTE) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(c.hex.slice(i, i + 2), 16)) as [
        number,
        number,
        number,
      ];
      const nudged = parseHex(
        `#${[r + 2, g - 2, b + 2]
          .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
          .join('')}`,
      );
      expect(colorName(c.hex)).toBe(c.name);
      expect(colorName(nudged)).toBe(c.name);
    }
  });
});

describe('nearbyColors', () => {
  const names = (hex: string, count = 4) => nearbyColors(parseHex(hex), count).map((c) => c.name);

  it('does not offer the color it was asked about', () => {
    expect(names('#4a6285')).not.toContain('Denim');
  });

  it('offers blues for a blue, before anything neutral', () => {
    expect(names('#4a6285', 2)).toEqual(expect.arrayContaining(['Navy', 'Forest']));
  });

  it('includes Navy and Pale blue for a denim reading', () => {
    const result = names('#4a6285', 4);
    expect(result).toContain('Navy');
    expect(result).toContain('Pale blue');
  });

  // The same split colorName makes: a grey shirt should not be offered Pale blue.
  it('offers only neutrals for a grey', () => {
    const neutrals = ['Black', 'Charcoal', 'Grey', 'Light grey', 'White'];
    for (const name of names('#8f8f8f')) expect(neutrals).toContain(name);
  });

  it('fills from the other side when one side runs out', () => {
    // There are five neutrals; a grey asks for seven, so two colors fill in.
    expect(nearbyColors(parseHex('#8f8f8f'), 7)).toHaveLength(7);
  });

  it('returns them nearest first by weighted distance', () => {
    const NEARBY_LIGHTNESS_WEIGHT = 0.35;
    const weightedDistance = (a: string, b: string): number => {
      const [l1, a1, b1] = hexToOklab(parseHex(a));
      const [l2, a2, b2] = hexToOklab(parseHex(b));
      return Math.hypot(NEARBY_LIGHTNESS_WEIGHT * (l1 - l2), a1 - a2, b1 - b2);
    };
    const hex = '#4a6285';
    const found = nearbyColors(parseHex(hex), 4).map((c) => weightedDistance(c.hex, hex));
    expect([...found].sort((a, b) => a - b)).toEqual(found);
  });
});
