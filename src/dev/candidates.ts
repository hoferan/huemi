import type { Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { PALETTE } from '../color/palette';

export type Candidate = { hex: Hex; name: string; slot: Slot };

/**
 * The seam the engine drops into.
 *
 * Until #10 exists there is nothing ranking anything, so this enumerates the
 * palette instead of suggesting from it, and the harness sorts the result by
 * whichever primitive you are looking at. #10 replaces the body with a call to
 * the real `suggest`, and the harness stops changing.
 */
export function candidates(base: Hex, baseSlot: Slot, slot: Slot): Candidate[] {
  return PALETTE.filter((color) => !(slot === baseSlot && color.hex === base)).map((color) => ({
    hex: color.hex,
    name: color.name,
    slot,
  }));
}
