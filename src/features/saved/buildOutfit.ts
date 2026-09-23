import type { Hex } from '../../model/hex';
import { SLOTS, type Outfit, type Slot } from '../../model/types';
import type { Base, SlotPick } from '../../session/types';
import { outfitName } from './outfitName';

/**
 * The outfit on screen, as it is stored: hexes, never positions in a
 * suggestion list, so an engine change cannot alter what was saved.
 */
export function buildOutfit(
  base: Base,
  picks: Partial<Record<Slot, SlotPick>>,
  id: string,
  now: Date,
): Outfit {
  const pieces: Partial<Record<Slot, Hex>> = { [base.slot]: base.hex };
  for (const slot of SLOTS) {
    const pick = picks[slot];
    if (slot === base.slot || !pick) continue;
    pieces[slot] = pick.hex;
  }
  return {
    version: 1,
    id,
    name: outfitName(base),
    createdAt: now.toISOString(),
    baseSlot: base.slot,
    pieces,
  };
}
