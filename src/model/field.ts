import type { Hex } from './hex';
import type { Pixels } from './frame';

/** The lighting a capture was taken in, chosen by hand at the shutter. */
export type Light = 'daylight' | 'dim' | 'lamp' | 'shop' | 'other';

export const LIGHTS: readonly Light[] = ['daylight', 'dim', 'lamp', 'shop', 'other'];

export const LIGHT_LABELS: Readonly<Record<Light, string>> = {
  daylight: 'Daylight',
  dim: 'Dim',
  lamp: 'Lamp',
  shop: 'Shop',
  other: 'Other',
};

/** A real garment with its known colors: one hex, or two to three for a multicolor piece. */
export type FieldGarment = {
  id: string;
  label: string;
  truth: readonly Hex[];
  createdAt: string;
};

/**
 * One recorded camera frame's metadata. The pixels are stored apart, because
 * a frame is far larger than the rest of the record. `garmentId` and
 * `settled` are null for a capture taken in normal use and not yet linked to
 * a garment. `lowLight` is null for an uploaded photo, which has no shutter
 * warning.
 */
export type FieldCapture = {
  id: string;
  source: 'kit' | 'flow';
  garmentId: string | null;
  settled: Hex | null;
  light: Light;
  lowLight: boolean | null;
  width: number;
  height: number;
  takenAt: string;
  build: string;
};

/** The file a field set is exported to and merged from. */
export type FieldExport = {
  version: 1;
  exportedAt: string;
  garments: FieldGarment[];
  captures: (FieldCapture & { pixels: Pixels })[];
};
