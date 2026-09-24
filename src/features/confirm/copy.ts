// The confirm screen's words, apart from its components so that tests can
// match on them and react-refresh still sees a module that exports no
// component. Strings are verbatim from the confirm-and-correct spec.

export const TITLE_SINGLE = 'Is this the color?';
export const TITLE_SEVERAL = 'Which color is it?';
export const TITLE_UNCLEAR = 'Tap your garment';

export const CAPTION_READ = 'We read';
export const CAPTION_CORRECTED = 'Your correction';

export const LOOKS_RIGHT = 'Looks right';
export const USE_THIS = 'Use this color';
export const NOT_QUITE = 'Not quite';
export const DONE = 'Done';

export const PICK_BY_HAND = 'Pick by hand';
export const NEITHER = 'Neither, pick by hand';
export const TAP_ELSEWHERE = 'Tap somewhere else';

export const CLOSER = 'Closer to one of these?';
export const LIGHTER_DARKER = 'Lighter or darker';

export const UNCLEAR_BODY = "We couldn't tell which color is the garment. Tap it on your photo.";
export const STILL_UNCLEAR = 'Still not clear. Try tapping the middle of the garment.';

export const useColor = (name: string): string => `Use ${name}`;
