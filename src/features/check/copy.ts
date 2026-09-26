import type { CaptureCopy } from '../camera/copy';
import type { Observation, WornPiece } from '../../color/check';
import { colorName } from '../../color/palette';
import type { CheckSlot } from '../../model/types';

// The outfit check's words, apart from its components for the reason
// camera/copy.ts gives: tests match on them, and react-refresh still sees
// modules that export one component each.

export const CAPTURE_TITLE = 'Frame the outfit';

export const ENTER_COLORS = 'Enter the colors';

export const OUTFIT_CAPTURE: CaptureCopy = {
  panels: {
    denied: {
      heading: "huemi can't see your camera",
      body: 'Allow camera access in Settings, or enter the colors yourself. You can also choose a photo you already have.',
    },
    unavailable: {
      heading: 'No camera found',
      body: 'Enter the colors yourself, or choose a photo you already have.',
    },
    failed: {
      heading: "The camera didn't start",
      body: 'Try again, enter the colors yourself, or choose a photo you already have.',
    },
  },
  handEntry: ENTER_COLORS,
};

/** Worded as a person would say it, which the slot labels are not ("Tap your bottom"). */
export const TAP_PROMPTS: Readonly<Record<CheckSlot, string>> = {
  outerwear: 'Tap your jacket or coat',
  top: 'Tap your top',
  bottom: 'Tap your trousers or skirt',
  shoes: 'Tap your shoes',
};

export const TAP_UNCLEAR = "Couldn't read that. Tap the middle of the piece, or skip.";

export const SKIP = 'Skip';

export const PIECES_TITLE = 'What are you wearing?';

export const PIECES_BODY = 'Tap each piece to set its color.';

export const NOT_SET = 'Not set';

export const NOT_WEARING = 'Not wearing this';

export const CHECK_IT = 'How does it work together?';

export const NEED_TWO = 'Set at least two pieces first.';

export const CHECK_TITLE = 'How it works together';

/**
 * How a sentence names a piece. Trousers and shoes are plural, and the verb
 * has to follow. "Trousers" stands for the bottom slot, skirts included, as
 * the PO chose on 2026-09-25: a tap prompt can say "trousers or skirt", a
 * sentence cannot.
 */
const PIECE: Readonly<Record<CheckSlot, { noun: string; plural: boolean }>> = {
  outerwear: { noun: 'jacket', plural: false },
  top: { noun: 'top', plural: false },
  bottom: { noun: 'trousers', plural: true },
  shoes: { noun: 'shoes', plural: true },
};

/**
 * "rust trousers". Lower case mid-sentence, palette names included: the
 * capital that tells a palette name from a description in a block's label
 * (colorName) reads as a typo inside a sentence.
 */
const named = (piece: WornPiece): string =>
  `${colorName(piece.hex).toLowerCase()} ${PIECE[piece.slot].noun}`;

const carries = (piece: WornPiece): string => (PIECE[piece.slot].plural ? 'carry' : 'carries');

/** The sentence for one observation. The sentence is the result (handoff notes). */
export function observationText(observation: Observation): string {
  switch (observation.kind) {
    case 'neutral':
      return 'All neutrals, so nothing competes.';
    // Both say which piece carries the most color and no more: the observation
    // does not know how the rest compare, and two pieces can carry nearly the
    // same amount.
    case 'quiet': {
      const [piece] = observation.pieces;
      return `Quiet overall, and the ${named(piece)} ${carries(piece)} the most color.`;
    }
    case 'colorful': {
      const [piece] = observation.pieces;
      return `Plenty of color, and the ${named(piece)} ${carries(piece)} the most.`;
    }
    case 'warm':
      return 'The colors all sit on the warm side.';
    case 'cool':
      return 'The colors all sit on the cool side.';
    case 'mixed': {
      const [warm, cool] = observation.pieces;
      return `Warm and cool together: the ${named(warm)} and the ${named(cool)}.`;
    }
    case 'tonal':
      return 'Close in lightness, which reads calm.';
    case 'contrast': {
      const [light, dark] = observation.pieces;
      return `The ${named(light)} and the ${named(dark)} give it clear light and dark.`;
    }
  }
}
