import type { CameraFailure } from '../../camera/port';

// The guided runs' words, kept apart from the screens like the field
// recorder's, so each run names the same things the same way.

export const READING_TITLE = 'Check color reading';
export const MATCH_GARMENT = 'Match the garment';

export const QUESTION_READING = 'Is this its color?';
export const QUESTION_PAIR = 'Would you wear these together?';
export const WHICH_BLOCK = 'Which one would you change?';
export const PICK_BETTER = 'Pick a better one';
export const CLOSER = 'Which is closer?';
export const LOOK_AT_GARMENT = 'Look at the garment, not the photo.';
export const POINT_AT_PLAIN = 'Point at a plain garment';
export const NONE_OF_THESE = 'None of these';
export const NOTHING_WORKS = 'Nothing works with it';
export const USE_THIS = 'Use this color';
export const SKIP = 'Skip';
export const UNDO = 'Undo';
export const YES = 'Yes';
export const NO = 'No';
export const START = 'Start';
export const AGAIN = 'Another run';

export const LENGTH_GROUP = 'Number of questions';
export const CHOOSE_LENGTH = 'Choose a length';
export const CHOOSE_LIGHT = 'Choose the light';
export const SWIPE_HINT = 'Swipe right for yes, left for no.';
export const RUN_PROGRESS = 'Progress';

export const progressText = (index: number, length: number): string => `${index + 1} of ${length}`;

export const PICK_CLOSER = 'Pick a closer color, or skip.';
export const UNDO_FAILED = "Couldn't take that answer back.";
export const MISSES = 'Misses';
export const SKIPPED = 'Skipped';

/**
 * The camera's panels for a run. The app's own offer picking by hand or
 * choosing a photo, and a run has neither: an uploaded photo was lit
 * somewhere else, so it would mislabel the capture.
 */
export const RUN_CAMERA_PANELS: Readonly<Record<CameraFailure, { heading: string; body: string }>> =
  {
    denied: {
      heading: "huemi can't see your camera",
      body: 'Allow camera access in Settings to go on with the run.',
    },
    unavailable: { heading: 'No camera found', body: 'The run needs a camera.' },
    failed: { heading: "The camera didn't start", body: 'Try again to go on with the run.' },
  };

export const readingHeadline = (right: number, length: number, light: string): string =>
  `${right} of ${length} right under ${light}`;

/** What the reader made of a missed shot, named by the color the run showed for it. */
export const readCaption = (kind: 'single' | 'several' | 'unclear', name: string): string =>
  kind === 'single'
    ? `Read ${name}`
    : kind === 'several'
      ? `Read several, mostly ${name}`
      : `Unclear, mostly ${name}`;

export const trueCaption = (name: string): string => `True ${name}`;
