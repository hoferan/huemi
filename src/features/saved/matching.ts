import { SLOTS, type Outfit, type Slot } from '../../model/types';
import type { Base, SlotPick } from '../../session/types';

/**
 * Whether a saved outfit is exactly what is on screen: the same base in the
 * same slot and the same colour in every other slot. Cursors are not part of
 * an outfit, so they are not compared. This is what fills the bookmark.
 */
export function sameOutfit(
  outfit: Outfit,
  base: Base,
  picks: Partial<Record<Slot, SlotPick>>,
): boolean {
  if (outfit.baseSlot !== base.slot) return false;
  return SLOTS.every((slot) => {
    const shown = slot === base.slot ? base.hex : picks[slot]?.hex;
    return outfit.pieces[slot] === shown;
  });
}
