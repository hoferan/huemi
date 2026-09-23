import { SLOTS, type Outfit, type Slot } from '../../model/types';
import { composeOutfit, locate } from '../../session/select';
import type { Base, SlotPick } from '../../session/types';

/**
 * What `outfitLoaded` needs to put a saved outfit back on the suggestions
 * screen. Each piece is found again in its slot's list so the block can say
 * "n of 18"; `locate` returns null for a colour the list no longer holds, and
 * the pick then carries no cursor. A slot the outfit lacks gets the same
 * starting suggestion a fresh visit would, rather than an empty gap.
 */
export function openOutfit(outfit: Outfit): {
  base: Base;
  picks: Partial<Record<Slot, SlotPick>>;
} {
  // parseOutfit rejects an outfit with no piece in its base slot, and every
  // outfit reaching this function came through it.
  const base: Base = { slot: outfit.baseSlot, hex: outfit.pieces[outfit.baseSlot]! };
  const loaded: Partial<Record<Slot, SlotPick>> = {};
  for (const slot of SLOTS) {
    const hex = outfit.pieces[slot];
    if (slot === base.slot || !hex) continue;
    const position = locate(base, slot, hex);
    loaded[slot] = position ? { hex, cursor: position.cursor } : { hex };
  }
  return { base, picks: composeOutfit(base, loaded, () => 0) };
}
