import { describe, expect, it } from 'vitest';
import { parseHex } from './hex';
import { FULL_SHAPE, isWorn, shapeFor, shapeOf, wornSlots } from './shape';
import { SLOTS } from './types';

const navy = parseHex('#1f2a44');
const tan = parseHex('#c9ad86');
const camel = parseHex('#b58a5a');

describe('wornSlots', () => {
  it('leaves out the optional pieces that are off, head to toe', () => {
    expect(wornSlots({ outerwear: false, accessory: true })).toEqual([
      'top',
      'bottom',
      'shoes',
      'accessory',
    ]);
  });

  it('is every slot for the full shape', () => {
    expect(wornSlots(FULL_SHAPE)).toEqual(SLOTS);
  });
});

describe('isWorn', () => {
  it('always wears the pieces that are not optional', () => {
    const bare = { outerwear: false, accessory: false };
    expect(isWorn(bare, 'shoes')).toBe(true);
    expect(isWorn(bare, 'top')).toBe(true);
    expect(isWorn(bare, 'outerwear')).toBe(false);
  });
});

describe('shapeFor', () => {
  it('wears the base even when the preference leaves its slot out', () => {
    expect(shapeFor('accessory', { outerwear: false, accessory: false })).toEqual({
      outerwear: false,
      accessory: true,
    });
  });

  it('is the preference when the base is not optional', () => {
    expect(shapeFor('top', { outerwear: false, accessory: true })).toEqual({
      outerwear: false,
      accessory: true,
    });
  });
});

describe('shapeOf', () => {
  it('wears an optional piece only when the outfit has one', () => {
    expect(shapeOf({ bottom: navy, shoes: tan }, 'bottom')).toEqual({
      outerwear: false,
      accessory: false,
    });
  });

  it('wears the base', () => {
    expect(shapeOf({ accessory: camel }, 'accessory').accessory).toBe(true);
  });
});
