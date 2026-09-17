import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { chroma, isNeutral, temperature } from './classify';
import { PALETTE } from './palette';

const NEUTRAL_NAMES = ['Black', 'Charcoal', 'Grey', 'Light grey', 'White'];

const hexNamed = (name: string) => PALETTE.find((c) => c.name === name)!.hex;

describe('chroma', () => {
  it('is zero for a pure grey', () => {
    expect(chroma(parseHex('#8a8a8a'))).toBeCloseTo(0, 5);
  });

  it('separates the palette greys from the chromatic entries by a wide margin', () => {
    const greys = NEUTRAL_NAMES.map(hexNamed).map(chroma);
    const chromatic = PALETTE.filter((c) => !NEUTRAL_NAMES.includes(c.name))
      .map((c) => c.hex)
      .map(chroma);

    expect(Math.max(...greys)).toBeLessThan(0.005);
    expect(Math.min(...chromatic)).toBeGreaterThan(0.03);
  });
});

describe('isNeutral', () => {
  it('calls every grey in the palette neutral, white included', () => {
    for (const name of NEUTRAL_NAMES) {
      expect(isNeutral(hexNamed(name)), name).toBe(true);
    }
  });

  it('calls every chromatic entry in the palette chromatic', () => {
    for (const color of PALETTE.filter((c) => !NEUTRAL_NAMES.includes(c.name))) {
      expect(isNeutral(color.hex), color.name).toBe(false);
    }
  });

  it('holds near white, where HSL saturation blows up to 100', () => {
    expect(isNeutral(parseHex('#fffefc'))).toBe(true);
  });

  it('splits two greys one step apart across the cutoff', () => {
    expect(isNeutral(parseHex('#80808d'))).toBe(true);
    expect(isNeutral(parseHex('#80808e'))).toBe(false);
  });

  it('leaves a near-black with a real blue cast chromatic', () => {
    expect(isNeutral(parseHex('#050710'))).toBe(false);
  });
});

describe('temperature', () => {
  it('calls white neutral', () => {
    expect(temperature(hexNamed('White'))).toBe('neutral');
  });

  it('calls a low-chroma color neutral regardless of hue', () => {
    expect(temperature(parseHex('#8a8a8a'))).toBe('neutral');
    expect(temperature(parseHex('#e6e5e2'))).toBe('neutral');
  });

  it('calls rust and camel warm', () => {
    expect(temperature(parseHex('#a4522d'))).toBe('warm');
    expect(temperature(parseHex('#b58a5a'))).toBe('warm');
  });

  it('calls navy and denim cool', () => {
    expect(temperature(parseHex('#1f2a44'))).toBe('cool');
    expect(temperature(parseHex('#4a6285'))).toBe('cool');
  });

  it('splits olive from forest, the closest warm and cool pair in the palette', () => {
    expect(temperature(hexNamed('Olive'))).toBe('warm');
    expect(temperature(hexNamed('Forest'))).toBe('cool');
  });

  it('calls burgundy warm, on the far side of the hue wrap', () => {
    expect(temperature(hexNamed('Burgundy'))).toBe('warm');
  });
});
