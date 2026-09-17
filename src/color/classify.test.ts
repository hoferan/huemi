import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { isNeutral, saturation, temperature } from './classify';

describe('temperature', () => {
  it('calls a low-saturation color neutral regardless of hue', () => {
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
});

describe('saturation', () => {
  it('is zero for a pure grey', () => {
    expect(saturation(parseHex('#8a8a8a'))).toBeCloseTo(0, 5);
  });
});

describe('isNeutral', () => {
  it('matches the temperature classification', () => {
    expect(isNeutral(parseHex('#8a8a8a'))).toBe(true);
    expect(isNeutral(parseHex('#a4522d'))).toBe(false);
  });
});
