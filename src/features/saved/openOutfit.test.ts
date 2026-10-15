import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { composeOutfit, locate } from '../../session/select';
import { openOutfit } from './openOutfit';
import { makeOutfit, NAVY_BOTTOM } from './testing';

describe('openOutfit', () => {
  it('gives back the base and each piece at its position in the list', () => {
    const outfit = makeOutfit();
    const { base, picks } = openOutfit(outfit);
    expect(base).toEqual(NAVY_BOTTOM);
    for (const slot of ['outerwear', 'top', 'shoes', 'accessory'] as const) {
      const hex = outfit.pieces[slot]!;
      expect(picks[slot]).toEqual({ hex, cursor: locate(NAVY_BOTTOM, slot, hex)!.cursor });
    }
  });

  // A hex the engine no longer suggests has no position. The block then says
  // nothing about one rather than something false.
  it('omits the cursor for a piece the list does not contain', () => {
    const odd = parseHex('#ff00ff');
    const { picks } = openOutfit(makeOutfit({ pieces: { bottom: NAVY_BOTTOM.hex, top: odd } }));
    expect(picks.top).toEqual({ hex: odd });
  });

  it('fills only the pieces an outfit cannot leave out', () => {
    const { shape, picks } = openOutfit(makeOutfit({ pieces: { bottom: NAVY_BOTTOM.hex } }));
    expect(shape).toEqual({ outerwear: false, accessory: false, dress: false });
    expect(Object.keys(picks).sort()).toEqual(['shoes', 'top']);
    expect(picks).toEqual(composeOutfit(NAVY_BOTTOM, {}, () => 0, shape));
  });

  it('reopens without the accessory it was saved without', () => {
    const full = makeOutfit();
    const pieces = { ...full.pieces };
    delete pieces.accessory;
    const { shape, picks } = openOutfit(makeOutfit({ pieces }));
    expect(shape).toEqual({ outerwear: true, accessory: false, dress: false });
    expect(picks.accessory).toBeUndefined();
    for (const slot of ['outerwear', 'top', 'shoes'] as const) {
      expect(picks[slot]?.hex).toBe(pieces[slot]);
    }
  });

  it('reopens a dress without a top or a bottom', () => {
    const rust = parseHex('#a4522d');
    const { shape, picks } = openOutfit(
      makeOutfit({ baseSlot: 'shoes', pieces: { dress: rust, shoes: parseHex('#c9ad86') } }),
    );
    expect(shape).toEqual({ outerwear: false, accessory: false, dress: true });
    expect(Object.keys(picks)).toEqual(['dress']);
    expect(picks.dress?.hex).toBe(rust);
  });
});
