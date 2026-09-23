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

  it('fills a slot the outfit is missing with the usual starting suggestion', () => {
    const { picks } = openOutfit(makeOutfit({ pieces: { bottom: NAVY_BOTTOM.hex } }));
    expect(picks).toEqual(composeOutfit(NAVY_BOTTOM, {}, () => 0));
  });
});
