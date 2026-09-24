import { describe, expect, it } from 'vitest';
import type { Pixels } from '../model/frame';
import { isHex, type Hex } from '../model/hex';
import { rgbToHex, type Rgb } from './convert';
import { oklabDistance, hexToOklab } from './oklab';
import {
  READ_TUNING,
  colorsIn,
  decide,
  defaultRegion,
  readColor,
  tapRegion,
  type ColorShare,
} from './read';

function paint(width: number, height: number, at: (x: number, y: number) => Rgb): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = at(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

const NAVY: Rgb = [43, 58, 92];
const WHITE: Rgb = [236, 235, 230];
const RUST: Rgb = [168, 65, 58];
const OLIVE: Rgb = [93, 107, 82];
const BEIGE: Rgb = [185, 173, 154];
const CHARCOAL: Rgb = [58, 54, 51];
const MUSTARD: Rgb = [217, 195, 138];

const near = (hex: Hex, rgb: Rgb) => oklabDistance(hex, rgbToHex(rgb)) < 0.02;

const solid = (rgb: Rgb, size = 100) => paint(size, size, () => rgb);

// Five colors in 8px squares, none covering more than a fifth.
const busy = (x: number, y: number): Rgb =>
  [BEIGE, OLIVE, RUST, CHARCOAL, MUSTARD][(Math.floor(x / 8) + 2 * Math.floor(y / 8)) % 5]!;

describe('defaultRegion', () => {
  it('centers a circle a fifth of the short side in radius', () => {
    expect(defaultRegion(paint(200, 100, () => NAVY))).toEqual({ cx: 100, cy: 50, r: 20 });
  });
});

describe('tapRegion', () => {
  it('centers a small circle on the tap', () => {
    expect(
      tapRegion(
        paint(200, 100, () => NAVY),
        30,
        40,
      ),
    ).toEqual({ cx: 30, cy: 40, r: 8 });
  });
});

describe('readColor', () => {
  it('reads a plain garment as a single color', () => {
    const reading = readColor(solid(NAVY));
    expect(reading.kind).toBe('single');
    if (reading.kind === 'single') expect(near(reading.color, NAVY)).toBe(true);
  });

  it('keeps a plain garment single under shading across it', () => {
    const fold = paint(
      100,
      100,
      (x, y) => NAVY.map((v) => v * (0.5 + 0.5 * ((x + y) / 198))) as Rgb,
    );
    expect(readColor(fold).kind).toBe('single');
  });

  it('is not pulled toward white by a few highlight pixels', () => {
    const shiny = paint(100, 100, (x, y) => ((x * 7 + y * 13) % 33 === 0 ? [255, 255, 255] : NAVY));
    const reading = readColor(shiny);
    expect(reading.kind).toBe('single');
    if (reading.kind === 'single') expect(near(reading.color, NAVY)).toBe(true);
  });

  it('offers both colors of a striped garment, largest first', () => {
    const stripes = paint(100, 100, (_, y) => (y % 10 < 6 ? NAVY : WHITE));
    const reading = readColor(stripes);
    expect(reading.kind).toBe('several');
    if (reading.kind !== 'several') return;
    expect(reading.colors).toHaveLength(2);
    expect(near(reading.colors[0]!.color, NAVY)).toBe(true);
    expect(near(reading.colors[1]!.color, WHITE)).toBe(true);
    expect(reading.colors[0]!.share).toBeGreaterThan(0.5);
    expect(reading.colors[0]!.share).toBeLessThan(0.7);
  });

  it('offers three colors of a three-color print', () => {
    const print = paint(100, 100, (x) => (x % 12 < 4 ? NAVY : x % 12 < 8 ? RUST : OLIVE));
    const reading = readColor(print);
    expect(reading.kind).toBe('several');
    if (reading.kind !== 'several') return;
    expect(reading.colors).toHaveLength(3);
    const shares = reading.colors.map((c) => c.share);
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
  });

  it('gives up on a busy scene with no dominant color', () => {
    expect(readColor(paint(100, 100, busy)).kind).toBe('unclear');
  });

  it('reads only inside the default circle', () => {
    const framed = paint(100, 100, (x, y) =>
      x >= 20 && x < 80 && y >= 20 && y < 80 ? NAVY : WHITE,
    );
    const reading = readColor(framed);
    expect(reading.kind).toBe('single');
    if (reading.kind === 'single') expect(near(reading.color, NAVY)).toBe(true);
  });

  it('finds the garment in a busy scene around a tap', () => {
    const scene = paint(200, 200, (x, y) =>
      x >= 20 && x < 80 && y >= 120 && y < 180 ? RUST : busy(x, y),
    );
    const reading = readColor(scene, tapRegion(scene, 50, 150));
    expect(reading.kind).toBe('single');
    if (reading.kind === 'single') expect(near(reading.color, RUST)).toBe(true);
  });

  it('reads the part of a tap region that is inside the frame', () => {
    const frame = solid(NAVY);
    expect(readColor(frame, tapRegion(frame, 1, 1)).kind).toBe('single');
  });

  it.each([
    ['entirely outside the frame', { cx: 500, cy: 500, r: 8 }],
    ['of zero radius', { cx: 50, cy: 50, r: 0 }],
    ['at an unmeasured position', { cx: Number.NaN, cy: 5, r: 8 }],
  ])('is unclear for a region %s', (_, region) => {
    expect(readColor(solid(NAVY), region)).toEqual({ kind: 'unclear' });
  });

  it('is unclear for an empty frame', () => {
    expect(readColor({ width: 0, height: 0, data: new Uint8ClampedArray(0) })).toEqual({
      kind: 'unclear',
    });
  });

  it('reads a full-size frame the same way', () => {
    const stripes = paint(512, 384, (_, y) => (y % 10 < 6 ? NAVY : WHITE));
    expect(readColor(stripes).kind).toBe('several');
  });

  it('gives the same reading twice', () => {
    const frame = paint(100, 100, busy);
    expect(readColor(frame)).toEqual(readColor(frame));
  });
});

describe('colorsIn', () => {
  it('lists every group with shares summing to one and valid hexes', () => {
    const found = colorsIn(paint(100, 100, busy));
    expect(found.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 10);
    for (const { color } of found) {
      expect(isHex(color)).toBe(true);
      expect(hexToOklab(color).some(Number.isNaN)).toBe(false);
    }
  });
});

describe('decide', () => {
  const share = (hex: string, s: number): ColorShare => ({ color: hex as Hex, share: s });

  it('is unclear with nothing found', () => {
    expect(decide([])).toEqual({ kind: 'unclear' });
  });

  it('is single at the threshold', () => {
    expect(decide([share('#2b3a5c', READ_TUNING.singleMin), share('#ecebe6', 0.3)]).kind).toBe(
      'single',
    );
  });

  it('drops parts below the minimum share from several', () => {
    const reading = decide([share('#2b3a5c', 0.5), share('#ecebe6', 0.4), share('#a8413a', 0.1)]);
    expect(reading).toEqual({
      kind: 'several',
      colors: [share('#2b3a5c', 0.5), share('#ecebe6', 0.4)],
    });
  });

  it('is unclear when the parts do not cover enough', () => {
    expect(
      decide([
        share('#2b3a5c', 0.4),
        share('#ecebe6', 0.2),
        share('#a8413a', 0.2),
        share('#5d6b52', 0.2),
      ]).kind,
    ).toBe('unclear');
  });
});
