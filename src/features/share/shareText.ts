import { colorName } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';

/**
 * "Camel outerwear, white top, navy bottom, tan shoes." The text a share
 * carries beside the image, so someone who cannot see the picture still gets
 * the outfit. Lower case mid-sentence, palette names included, as the check's
 * sentences write them.
 */
export function shareText(pieces: Partial<Record<Slot, Hex>>): string {
  const sentence = SLOTS.flatMap((slot) => {
    const hex = pieces[slot];
    return hex ? [`${colorName(hex).toLowerCase()} ${SLOT_LABELS[slot].toLowerCase()}`] : [];
  }).join(', ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
