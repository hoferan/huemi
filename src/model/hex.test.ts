import { describe, expect, it } from 'vitest';
import { isHex, parseHex } from './hex';

describe('parseHex', () => {
  it('accepts a six-digit hex and normalises to lowercase', () => {
    expect(parseHex('#1F2A44')).toBe('#1f2a44');
  });

  it('expands three-digit shorthand', () => {
    expect(parseHex('#fff')).toBe('#ffffff');
  });

  it('throws on a value that is not a hex colour', () => {
    expect(() => parseHex('rebeccapurple')).toThrow(/invalid hex/i);
  });

  it('throws on a missing leading hash', () => {
    expect(() => parseHex('1f2a44')).toThrow(/invalid hex/i);
  });
});

describe('isHex', () => {
  it('narrows a valid value', () => {
    expect(isHex('#1f2a44')).toBe(true);
  });

  it('rejects an invalid value without throwing', () => {
    expect(isHex('nope')).toBe(false);
  });
});
