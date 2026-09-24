import type { CameraFailure } from './port';

// The camera screen's words, apart from its component so that tests can match
// on them and react-refresh still sees a module that exports one component.

export const DARK_MESSAGE = 'Too dark to read the color well. Move to a window or turn on a light.';

export const PHOTO_FAILED = "That photo couldn't be opened. Try another one.";

export const PANELS: Readonly<Record<CameraFailure, { heading: string; body: string }>> = {
  denied: {
    heading: "huemi can't see your camera",
    body: 'Allow camera access in Settings, or pick the color by hand. You can also choose a photo you already have.',
  },
  unavailable: {
    heading: 'No camera found',
    body: 'Pick the color by hand, or choose a photo you already have.',
  },
  failed: {
    heading: "The camera didn't start",
    body: 'Try again, pick the color by hand, or choose a photo you already have.',
  },
};
