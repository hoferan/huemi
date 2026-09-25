import type { CaptureCopy } from '../camera/copy';
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
