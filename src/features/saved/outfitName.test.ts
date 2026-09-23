import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { outfitName } from './outfitName';

describe('outfitName', () => {
  it('names an outfit after its base', () => {
    expect(outfitName({ slot: 'bottom', hex: parseHex('#1f2a44') })).toBe('Navy bottom');
  });

  // colorName describes an off-palette colour in lowercase words.
  it('capitalises a described colour', () => {
    expect(outfitName({ slot: 'top', hex: parseHex('#ff00ff') })).toBe('Bright pink top');
  });
});
