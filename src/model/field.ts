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
 * How a guided run's reading compared with the garment's true color, as the
 * person judged it: the reader got it `right`, the person `corrected` it, or
 * the reader `missed` and gave no color.
 */
export type Verdict = 'right' | 'corrected' | 'missed';

export const VERDICTS: readonly Verdict[] = ['right', 'corrected', 'missed'];

/**
 * One recorded camera frame's metadata. The pixels are stored apart, because
 * a frame is far larger than the rest of the record. `garmentId` and
 * `settled` are null for a capture taken in normal use and not yet linked to
 * a garment. `lowLight` is null for an uploaded photo, which has no shutter
 * warning. `verdict` is set only on a capture from a guided run
 * (`source: 'run'`).
 */
export type FieldCapture = {
  id: string;
  source: 'kit' | 'flow' | 'run';
  garmentId: string | null;
  settled: Hex | null;
  light: Light;
  lowLight: boolean | null;
  width: number;
  height: number;
  takenAt: string;
  build: string;
  verdict?: Verdict;
};

/**
 * One answer from the color-pair run: a top and a bottom shown together, and
 * whether the person liked the pair. When they did not, `changed` names the
 * piece they would swap and `replacement` the color they chose for it from the
 * `offered` ones. `noneWorks` is true when they found nothing among those
 * offered that fixes the pair, so `replacement` is then null.
 */
export type PairVote = {
  id: string;
  takenAt: string;
  build: string;
  top: Hex;
  bottom: Hex;
  liked: boolean;
  changed: 'top' | 'bottom' | null;
  replacement: Hex | null;
  offered: Hex[];
  noneWorks: boolean;
};

/**
 * The file a field set is exported to and merged from. `setId` is a random id
 * the device picks at its first export and keeps, so a merge can tell a newer
 * export of the same set from an export of another. Version 1 files, which
 * have no `votes`, still decode, as version 2 with none.
 */
export type FieldExport = {
  version: 2;
  exportedAt: string;
  setId: string;
  garments: FieldGarment[];
  votes: PairVote[];
  captures: (FieldCapture & { pixels: Pixels })[];
};
