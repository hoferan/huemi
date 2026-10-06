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

export const CAPTURE = 'Capture';
export const LIGHT_GROUP = 'Light';
export const DELETE = 'Delete';
export const DELETE_GARMENT = 'Delete garment';
export const KEEP_IT = 'Keep it';
export const BACK_TO_GARMENT = 'Back to the garment';
export const CAPTURE_FAILED = "Couldn't record this capture.";
export const DELETE_CAPTURE_FAILED = "Couldn't delete this capture.";
export const DELETE_GARMENT_FAILED = "Couldn't delete this garment.";

export const captureTitle = (label: string): string => `Capture ${label}`;
export const captured = (light: string): string => `Captured: ${light}.`;
export const deleteGarmentTitle = (label: string, n: number): string =>
  `Delete ${label} and its ${n} captures?`;
export const garmentPath = (id: string): string =>
  `/dev/field/garment?id=${encodeURIComponent(id)}`;

export const RECORD = 'Record';
export const CAPTURE_RECORDED = 'Capture recorded.';
export const LINK_TO_GARMENT = 'Link to a garment';
export const LINK_FAILED = "Couldn't link this capture.";

export const EXPORTED = 'Field set exported.';
export const EXPORT_FAILED = "Couldn't export the field set.";
export const EXPORT_TITLE = 'huemi field set';
export const exportSize = (n: number, bytes: number): string =>
  `${captureCount(n)}, about ${(bytes / 1_000_000).toFixed(1)} MB`;
