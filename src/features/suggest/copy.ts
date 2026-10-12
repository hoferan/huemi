import type { OptionalSlot } from '../../model/shape';

/** The Pieces button, and the sheet it opens. */
export const PIECES = 'Pieces';

/** A row whose piece cannot be left out. */
export const ALWAYS = 'Always';

export const REMEMBERED = 'huemi keeps leaving out what you switch off.';

/** Why a row the base fixes has no switch. */
export const BASE_FIXES: Readonly<Record<OptionalSlot, string>> = {
  outerwear: 'Your base is outerwear.',
  accessory: 'Your base is an accessory.',
};
