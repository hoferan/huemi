import { describe, expect, it } from 'vitest';
import { suggest } from '../../../color/engine';
import { parseHex, type Hex } from '../../../model/hex';
import { SLOTS, type Slot } from '../../../model/types';
import { composeOutfit } from '../../../session/select';
import { suggestReadout } from './suggestReadout';

// The outfit `composeOutfit` seeds for a Mustard top. Its bottom fell to rank
// 11, which is the case the panel exists to explain.
const mustard: Partial<Record<Slot, Hex>> = {
  outerwear: parseHex('#8a8a8a'),
  top: parseHex('#c39a3a'),
  bottom: parseHex('#e6e5e2'),
  shoes: parseHex('#c9ad86'),
  accessory: parseHex('#b58a5a'),
};

const slotOf = (pieces: Partial<Record<Slot, Hex>>, baseSlot: Slot, slot: Slot) =>
  suggestReadout(baseSlot, pieces).slots.find((entry) => entry.slot === slot)!;

describe('suggestReadout', () => {
  it("states the outfit's chroma against the budget", () => {
    expect(suggestReadout('top', mustard).total).toBe('Outfit chroma 0.114 of 0.120');
  });

  it('lists every slot but the base, head to toe', () => {
    expect(suggestReadout('top', mustard).slots.map((entry) => entry.slot)).toEqual([
      'outerwear',
      'bottom',
      'shoes',
      'accessory',
    ]);
  });

  it("explains the bottom's rank by what kept each color above it out", () => {
    const bottom = slotOf(mustard, 'top', 'bottom');
    expect(bottom.heading).toBe('Bottom · Light grey · #11 of 21 · 1.85');
    expect(bottom.terms).toBe('L 0.25/1 · C 0.80/0.8 · T 0.50/0.5 · H 0.30/0.3');
    expect(bottom.note).toBeNull();
    expect(bottom.above).toEqual([
      'Grey: name shown in Outerwear',
      'Tan: name shown in Shoes',
      'Khaki: chroma 0.152',
      'Pink: chroma 0.165',
      'Camel: name shown in Accessory',
      'Pale blue: chroma 0.141',
      'Peach: chroma 0.169',
      'Mauve: chroma 0.183',
      'Cream: chroma 0.136',
      'Olive: chroma 0.160',
    ]);
  });

  it('gives a near-top pick a short list', () => {
    const shoes = slotOf(mustard, 'top', 'shoes');
    expect(shoes.heading).toBe('Shoes · Tan · #2 of 21 · 2.54');
    expect(shoes.above).toEqual(['Grey: name shown in Outerwear']);
  });

  it('says a color above the pick fits when nothing rules it out', () => {
    const twelfth = suggest(mustard.top!, 'bottom', 'top')[11]!.hex;
    const bottom = slotOf({ ...mustard, bottom: twelfth }, 'top', 'bottom');
    expect(bottom.above).toContain('Light grey: fits');
  });

  it('marks a pick the engine sorts last as a near-duplicate', () => {
    const pieces = { top: parseHex('#f7f6f3'), bottom: parseHex('#e6e5e2') };
    expect(slotOf(pieces, 'top', 'bottom').note).toBe('Near-duplicate of yours, sorted last');
  });

  // An outfit saved against an older palette can hold a color the engine no
  // longer offers.
  it('says so when a pick is not in the list', () => {
    const bottom = slotOf({ ...mustard, bottom: parseHex('#123456') }, 'top', 'bottom');
    expect(bottom.heading).toContain('· not in the list');
    expect(bottom.above).toEqual([]);
  });

  // A camera-read red coat spends the whole budget by itself (ADR 0012).
  it('says over when the base alone breaks the budget', () => {
    const base = { slot: 'outerwear' as const, hex: parseHex('#a3231f') };
    const picks = composeOutfit(base, {}, () => 0);
    const pieces: Partial<Record<Slot, Hex>> = { outerwear: base.hex };
    for (const slot of SLOTS) if (picks[slot]) pieces[slot] = picks[slot].hex;
    const readout = suggestReadout('outerwear', pieces);
    expect(readout.total).toMatch(/ over 0\.120$/);
    for (const entry of readout.slots) expect(entry.heading).toContain(' of 21 ');
  });
});
