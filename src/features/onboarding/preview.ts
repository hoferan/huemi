import { PALETTE } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { composeOutfit } from '../../session/select';
import type { Base } from '../../session/types';

/**
 * The garment the welcome screen's preview starts from. Light grey, because
 * it is a bottom most people own and the outfit the engine builds on it shows
 * a color beside a neutral rather than three neutrals.
 */
export const PREVIEW_BASE: Base = {
  slot: 'bottom',
  hex: PALETTE.find((color) => color.name === 'Light grey')!.hex,
};

export type PreviewOutfit = { top: Hex; bottom: Hex; shoes: Hex };

/**
 * The outfit the welcome screen draws beside its steps: the one the
 * suggestions screen starts from for the same base, so the preview cannot
 * promise an outfit the app would not suggest. `composeOutfit` fills every
 * slot but the base's, so the top and the shoes are always there.
 */
export function previewOutfit(): PreviewOutfit {
  const seeded = composeOutfit(PREVIEW_BASE, {}, () => 0);
  return { top: seeded.top!.hex, bottom: PREVIEW_BASE.hex, shoes: seeded.shoes!.hex };
}
