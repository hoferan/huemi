import { describe, expect, it } from 'vitest';
import { composeOutfit } from '../../session/select';
import { buildOutfit } from './buildOutfit';
import { NAVY_BOTTOM } from './testing';

describe('buildOutfit', () => {
  it('stores the base and every pick as hexes, never cursors', () => {
    const picks = composeOutfit(NAVY_BOTTOM, {}, () => 0);
    const now = new Date('2026-09-23T10:00:00.000Z');
    expect(buildOutfit(NAVY_BOTTOM, picks, 'id-1', now)).toEqual({
      version: 1,
      id: 'id-1',
      name: 'Navy bottom',
      createdAt: '2026-09-23T10:00:00.000Z',
      baseSlot: 'bottom',
      pieces: {
        bottom: NAVY_BOTTOM.hex,
        outerwear: picks.outerwear!.hex,
        top: picks.top!.hex,
        shoes: picks.shoes!.hex,
        accessory: picks.accessory!.hex,
      },
    });
  });

  it('leaves out a slot with no pick', () => {
    const outfit = buildOutfit(NAVY_BOTTOM, {}, 'id-2', new Date());
    expect(outfit.pieces).toEqual({ bottom: NAVY_BOTTOM.hex });
  });
});
