import type { Slot } from '../../model/types';

/** The Pieces button, and the sheet it opens. */
export const PIECES = 'Pieces';

/** A row whose piece cannot be left out. */
export const ALWAYS = 'Always';

export const REMEMBERED = 'huemi remembers these for your next outfit.';

/** The choice the dress offers, and the radio for wearing separates. */
export const BODY_CHOICE = 'Top and bottom, or a dress';
export const TOP_AND_BOTTOM = 'Top and bottom';

/** Why a row the base fixes has no control. */
export const BASE_FIXES: Readonly<Record<Exclude<Slot, 'shoes'>, string>> = {
  outerwear: 'Your base is outerwear.',
  top: 'Your base is a top.',
  bottom: 'Your base is a bottom.',
  dress: 'Your base is a dress.',
  accessory: 'Your base is an accessory.',
};
