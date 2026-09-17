import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../model/hex';
import { SLOTS, SLOT_AREA, type Slot } from '../model/types';
import { chromaLoad, hueContrast, lightnessContrast, temperatureMix } from './score';

const BLACK = parseHex('#1b1b1b');
const WHITE = parseHex('#f7f6f3');
const GREY = parseHex('#8a8a8a');
const RUST = parseHex('#a4522d');
const NAVY = parseHex('#1f2a44');
const MUSTARD = parseHex('#c39a3a');

const pieces = (entries: Partial<Record<Slot, Hex>>) => entries;

describe('SLOT_AREA', () => {
  it('covers every slot', () => {
    for (const slot of SLOTS) {
      expect(SLOT_AREA[slot], slot).toBeGreaterThan(0);
    }
  });

  it('orders the slots by how much of an outfit they cover', () => {
    expect(SLOT_AREA.outerwear).toBeGreaterThanOrEqual(SLOT_AREA.top);
    expect(SLOT_AREA.top).toBe(SLOT_AREA.bottom);
    expect(SLOT_AREA.bottom).toBeGreaterThan(SLOT_AREA.shoes);
    expect(SLOT_AREA.shoes).toBeGreaterThan(SLOT_AREA.accessory);
  });
});

describe('lightnessContrast', () => {
  it('is zero for a color against itself', () => {
    expect(lightnessContrast(RUST, RUST)).toBe(0);
  });

  it('is near one across the palette extremes', () => {
    expect(lightnessContrast(BLACK, WHITE)).toBeGreaterThan(0.75);
  });

  it('does not depend on the order of its arguments', () => {
    expect(lightnessContrast(NAVY, WHITE)).toBe(lightnessContrast(WHITE, NAVY));
  });
});

describe('hueContrast', () => {
  it('is zero for a color against itself', () => {
    expect(hueContrast(RUST, RUST)).toBe(0);
  });

  it('takes the short way around the wrap', () => {
    const red = parseHex('#c02020');
    const violet = parseHex('#8020c0');
    const contrast = hueContrast(red, violet);
    expect(contrast).not.toBeNull();
    expect(contrast!).toBeLessThanOrEqual(180);
  });

  it('is undefined when either color is neutral, because their hue is noise', () => {
    expect(hueContrast(GREY, RUST)).toBeNull();
    expect(hueContrast(RUST, WHITE)).toBeNull();
    expect(hueContrast(BLACK, GREY)).toBeNull();
  });

  it('separates rust from navy by more than rust from mustard', () => {
    expect(hueContrast(RUST, NAVY)!).toBeGreaterThan(hueContrast(RUST, MUSTARD)!);
  });
});

describe('chromaLoad', () => {
  it('is zero for an empty outfit', () => {
    expect(chromaLoad(pieces({}))).toBe(0);
  });

  it('is near zero for an outfit of neutrals', () => {
    expect(chromaLoad(pieces({ top: WHITE, bottom: GREY, shoes: BLACK }))).toBeLessThan(0.01);
  });

  it('charges the same color less in the accessory slot than in outerwear', () => {
    expect(chromaLoad(pieces({ accessory: RUST }))).toBeLessThan(
      chromaLoad(pieces({ outerwear: RUST })),
    );
  });

  it('lets a saturated accessory pass where a saturated coat does not', () => {
    const neutralBase = { top: WHITE, bottom: NAVY } as const;
    const withBag = chromaLoad(pieces({ ...neutralBase, accessory: RUST }));
    const withCoat = chromaLoad(pieces({ ...neutralBase, outerwear: RUST }));
    expect(withBag).toBeLessThan(withCoat);
  });

  it('ignores a slot present but empty, as a hand-edited store can produce', () => {
    const stored = JSON.parse('{"top":"#a4522d","bottom":null}') as Partial<Record<Slot, Hex>>;
    expect(chromaLoad(stored)).toBe(chromaLoad(pieces({ top: RUST })));
  });

  it('accepts an override so the harness can sweep the weights', () => {
    const flat = { outerwear: 1, top: 1, bottom: 1, shoes: 1, accessory: 1 };
    expect(chromaLoad(pieces({ accessory: RUST }), flat)).toBe(
      chromaLoad(pieces({ outerwear: RUST }), flat),
    );
  });
});

describe('temperatureMix', () => {
  it('counts an empty outfit as nothing', () => {
    expect(temperatureMix(pieces({}))).toEqual({ warm: 0, cool: 0, neutral: 0 });
  });

  it('sorts each piece into one group', () => {
    expect(temperatureMix(pieces({ outerwear: NAVY, top: WHITE, bottom: RUST }))).toEqual({
      warm: 1,
      cool: 1,
      neutral: 1,
    });
  });

  it('ignores a slot present but empty', () => {
    const stored = JSON.parse('{"top":"#a4522d","shoes":null}') as Partial<Record<Slot, Hex>>;
    expect(temperatureMix(stored)).toEqual({ warm: 1, cool: 0, neutral: 0 });
  });

  it('counts repeated colors once each', () => {
    expect(temperatureMix(pieces({ top: RUST, bottom: MUSTARD }))).toEqual({
      warm: 2,
      cool: 0,
      neutral: 0,
    });
  });
});
