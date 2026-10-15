import { describe, expect, it } from 'vitest';
import { parseHex } from './hex';
import {
  FULL_SHAPE,
  dressBesideSeparates,
  dressFixedBy,
  isWorn,
  shapeFor,
  shapeOf,
  wornSlots,
} from './shape';

const navy = parseHex('#1f2a44');
const tan = parseHex('#c9ad86');
const camel = parseHex('#b58a5a');
const rust = parseHex('#a4522d');

describe('wornSlots', () => {
  it('leaves out the optional pieces that are off, head to toe', () => {
    expect(wornSlots({ outerwear: false, accessory: true, dress: false })).toEqual([
      'top',
      'bottom',
      'shoes',
      'accessory',
    ]);
  });

  it('wears a top and a bottom in the full shape, and no dress', () => {
    expect(wornSlots(FULL_SHAPE)).toEqual(['outerwear', 'top', 'bottom', 'shoes', 'accessory']);
  });

  it('wears a dress in place of the top and the bottom', () => {
    expect(wornSlots({ outerwear: true, accessory: false, dress: true })).toEqual([
      'outerwear',
      'dress',
      'shoes',
    ]);
  });
});

describe('isWorn', () => {
  it('always wears the shoes', () => {
    const bare = { outerwear: false, accessory: false, dress: true };
    expect(isWorn(bare, 'shoes')).toBe(true);
    expect(isWorn(bare, 'outerwear')).toBe(false);
  });

  it('wears a top and a bottom or a dress, never both', () => {
    const separates = { ...FULL_SHAPE, dress: false };
    const dress = { ...FULL_SHAPE, dress: true };
    expect([isWorn(separates, 'top'), isWorn(separates, 'bottom')]).toEqual([true, true]);
    expect(isWorn(separates, 'dress')).toBe(false);
    expect([isWorn(dress, 'top'), isWorn(dress, 'bottom')]).toEqual([false, false]);
    expect(isWorn(dress, 'dress')).toBe(true);
  });
});

describe('dressFixedBy', () => {
  it('is fixed by a top, a bottom or a dress base, and free otherwise', () => {
    expect(dressFixedBy('top')).toBe(false);
    expect(dressFixedBy('bottom')).toBe(false);
    expect(dressFixedBy('dress')).toBe(true);
    expect(dressFixedBy('shoes')).toBeNull();
    expect(dressFixedBy('outerwear')).toBeNull();
    expect(dressFixedBy('accessory')).toBeNull();
  });
});

describe('shapeFor', () => {
  it('wears the base even when the preference leaves its slot out', () => {
    expect(shapeFor('accessory', { outerwear: false, accessory: false, dress: false })).toEqual({
      outerwear: false,
      accessory: true,
      dress: false,
    });
  });

  it('is the preference when the base fixes nothing', () => {
    expect(shapeFor('shoes', { outerwear: false, accessory: true, dress: true })).toEqual({
      outerwear: false,
      accessory: true,
      dress: true,
    });
  });

  it('wears a top and a bottom around a top, whatever the preference', () => {
    expect(shapeFor('top', { outerwear: true, accessory: true, dress: true }).dress).toBe(false);
    expect(shapeFor('bottom', { outerwear: true, accessory: true, dress: true }).dress).toBe(false);
  });

  it('wears the dress a dress base is, whatever the preference', () => {
    expect(shapeFor('dress', FULL_SHAPE).dress).toBe(true);
  });
});

describe('shapeOf', () => {
  it('wears an optional piece only when the outfit has one', () => {
    expect(shapeOf({ bottom: navy, shoes: tan }, 'bottom')).toEqual({
      outerwear: false,
      accessory: false,
      dress: false,
    });
  });

  it('wears the base', () => {
    expect(shapeOf({ accessory: camel }, 'accessory').accessory).toBe(true);
  });

  it('wears a dress when the outfit has one', () => {
    expect(shapeOf({ dress: rust, shoes: tan }, 'shoes').dress).toBe(true);
    expect(shapeOf({ dress: rust }, 'dress').dress).toBe(true);
  });

  it('wears a top and a bottom around a top base', () => {
    expect(shapeOf({ top: rust, shoes: tan }, 'top').dress).toBe(false);
  });
});

describe('dressBesideSeparates', () => {
  it('finds a dress worn with a top or a bottom, which no outfit can be', () => {
    expect(dressBesideSeparates({ dress: rust, top: navy })).toBe(true);
    expect(dressBesideSeparates({ dress: rust, bottom: navy })).toBe(true);
    expect(dressBesideSeparates({ dress: rust, shoes: tan })).toBe(false);
    expect(dressBesideSeparates({ top: rust, bottom: navy })).toBe(false);
  });
});
