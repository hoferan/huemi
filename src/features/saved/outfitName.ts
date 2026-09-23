import { colorName } from '../../color/palette';
import { SLOT_LABELS } from '../../model/types';
import type { Base } from '../../session/types';

/**
 * "Navy bottom". Renaming is out of scope for now (#18), so this is the only
 * name an outfit gets. `colorName` describes an off-palette colour in lowercase
 * words, hence the capital.
 */
export function outfitName(base: Base): string {
  const phrase = `${colorName(base.hex)} ${SLOT_LABELS[base.slot].toLowerCase()}`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
