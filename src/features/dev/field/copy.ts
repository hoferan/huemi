import type { BackTo } from '../../../ui/Screen';

// The field recorder's words, kept apart from the screens so react-refresh
// still sees modules that export one component, and so the kit's screens
// name each other's titles from one place.

export const LIST_TITLE = 'Field recorder';
export const MENU_BACK: BackTo = { to: '/dev', title: 'Developer mode' };
export const LIST_BACK: BackTo = { to: '/dev/field', title: LIST_TITLE };
export const ADD_GARMENT = 'Add garment';
export const EXPORT = 'Export';
export const NO_GARMENTS = 'No garments yet.';
export const FROM_NORMAL_USE = 'From normal use';
export const STORE_FAILED = 'The field store could not be opened.';

export const LABEL = 'Label';
export const HINT = 'Hold the garment by a window in daylight and match the block to it.';
export const COLOR_COUNT = 'Colors';
export const ONE_COLOR = 'One color';
export const SEVERAL_COLORS = 'Several colors';
export const ADD_A_COLOR = 'Add a color';
export const SAVE_GARMENT = 'Save garment';
export const NEEDS_LABEL = 'Give the garment a label.';
export const NEEDS_TWO_COLORS = 'Add a second color, or choose One color.';
export const SAVE_FAILED = "Couldn't save this garment.";

export const captureCount = (n: number): string => (n === 1 ? '1 capture' : `${n} captures`);
export const colorGroup = (n: number): string => `Color ${n}`;
