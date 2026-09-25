import type { Hex } from '../model/hex';
import { CHECK_SLOTS, type CheckSlot } from '../model/types';
import { temperature } from './classify';
import { chromaticStrength } from './engine';

/** The pieces of an outfit being checked. Accessories are left out (#23). */
export type WornPieces = Partial<Record<CheckSlot, Hex>>;

/** The pieces that are there, head to toe. The order is what breaks ties. */
function worn(pieces: WornPieces): { slot: CheckSlot; hex: Hex }[] {
  return CHECK_SLOTS.flatMap((slot) => {
    const hex = pieces[slot];
    return hex ? [{ slot, hex }] : [];
  });
}

/**
 * How hard the outfit pulls warm against cool, 0 to 1: the strongest warm and
 * cool pair, measured the way `rate()` damps its temperature term. A faint
 * color like Cream has little temperature to disagree with, so navy with cream
 * stays near zero.
 */
export function warmCoolStrength(pieces: WornPieces): number {
  const present = worn(pieces);
  let strongest = 0;
  for (const a of present) {
    if (temperature(a.hex) !== 'warm') continue;
    for (const b of present) {
      if (temperature(b.hex) !== 'cool') continue;
      strongest = Math.max(strongest, chromaticStrength(a.hex, b.hex));
    }
  }
  return strongest;
}
