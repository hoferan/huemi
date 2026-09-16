import { describe, expect, it } from 'vitest';
import { isHex, parseHex } from './hex';

describe('parseHex', () => {
  it('accepts a six-digit hex and normalizes to lowercase', () => {
    expect(parseHex('#1F2A44')).toBe('#1f2a44');
  });

  it('expands three-digit shorthand', () => {
    expect(parseHex('#fff')).toBe('#ffffff');
  });

  it('throws on a value that is not a hex color', () => {
    expect(() => parseHex('rebeccapurple')).toThrow(/invalid hex/i);
  });

  it('throws on a missing leading hash', () => {
    expect(() => parseHex('1f2a44')).toThrow(/invalid hex/i);
  });

  it('trims leading and trailing whitespace', () => {
    expect(parseHex('  #fff  ')).toBe('#ffffff');
    expect(parseHex('\t#1f2a44\n')).toBe('#1f2a44');
  });

  it('rejects four-digit CSS hex with alpha', () => {
    expect(() => parseHex('#1234')).toThrow(/invalid hex/i);
  });

  it('rejects eight-digit CSS hex with alpha', () => {
    expect(() => parseHex('#12345678')).toThrow(/invalid hex/i);
  });

  it('rejects empty string', () => {
    expect(() => parseHex('')).toThrow(/invalid hex/i);
  });

  it('rejects whitespace-only string', () => {
    expect(() => parseHex('   ')).toThrow(/invalid hex/i);
  });

  it('rejects hex with non-hex characters', () => {
    expect(() => parseHex('#gggggg')).toThrow(/invalid hex/i);
    expect(() => parseHex('#12345g')).toThrow(/invalid hex/i);
  });
});

describe('isHex', () => {
  it('narrows a valid canonical value', () => {
    expect(isHex('#1f2a44')).toBe(true);
  });

  it('rejects an invalid value without throwing', () => {
    expect(isHex('nope')).toBe(false);
  });

  it('rejects uppercase input, preserving the isHex-parseHex contract', () => {
    expect(isHex('#1F2A44')).toBe(false);
    // But parseHex accepts it and normalizes to canonical form
    expect(parseHex('#1F2A44')).toBe('#1f2a44');
    // After normalization, isHex is true
    expect(isHex(parseHex('#1F2A44'))).toBe(true);
  });

  it('rejects values with leading or trailing whitespace', () => {
    expect(isHex('  #1f2a44  ')).toBe(false);
    expect(isHex('\t#1f2a44\n')).toBe(false);
    // But parseHex trims and normalizes
    expect(parseHex('  #1f2a44  ')).toBe('#1f2a44');
    expect(isHex(parseHex('  #1f2a44  '))).toBe(true);
  });

  it('rejects three-digit shorthand', () => {
    expect(isHex('#fff')).toBe(false);
    // But parseHex expands and normalizes
    expect(parseHex('#fff')).toBe('#ffffff');
    expect(isHex(parseHex('#fff'))).toBe(true);
  });

  it('rejects four-digit CSS hex with alpha', () => {
    expect(isHex('#1234')).toBe(false);
  });

  it('rejects eight-digit CSS hex with alpha', () => {
    expect(isHex('#12345678')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isHex('')).toBe(false);
  });

  it('rejects hex with non-hex characters', () => {
    expect(isHex('#gggggg')).toBe(false);
    expect(isHex('#12345g')).toBe(false);
  });
});
