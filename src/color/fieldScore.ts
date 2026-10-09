import type { FieldExport, FieldGarment, Light } from '../model/field';
import type { Hex } from '../model/hex';
import { oklabDistance } from './oklab';
import { colorsIn, defaultRegion, explain, type ColorReading } from './read';

/**
 * How far off, in OKLab, a reading has to be before it counts as wrong.
 *
 * It starts at the clusterer's `mergeDistance`, the distance at which the
 * reader itself treats two colors as one. It is written out as a literal so
 * that retuning the clusterer leaves the yardstick where it is. M10 decides
 * whether it stays.
 */
export const WRONG_AT = 0.06;

/**
 * Where a capture's truth came from: a garment's colors, fixed in daylight in
 * the kit, or the color someone settled on in normal use, which is weaker
 * because it went through the same camera.
 */
export type TruthSource = 'garment' | 'settled';

/** How the reader did on one capture. */
export type CaptureScore = {
  id: string;
  /** The garment's label, or null for an unlinked flow capture. */
  label: string | null;
  source: TruthSource;
  light: Light;
  lowLight: boolean | null;
  width: number;
  height: number;
  truth: Hex[];
  reading: ColorReading;
  /** The colors the distance was taken from. */
  scored: Hex[];
  /** Null when the region gave no samples. */
  distance: number | null;
  verdictRight: boolean;
};

type Capture = FieldExport['captures'][number];

function truthOf(
  capture: Capture,
  garments: ReadonlyMap<string, FieldGarment>,
): { label: string | null; source: TruthSource; truth: Hex[] } | null {
  if (capture.garmentId !== null) {
    const garment = garments.get(capture.garmentId);
    return garment ? { label: garment.label, source: 'garment', truth: [...garment.truth] } : null;
  }
  return capture.settled === null
    ? null
    : { label: null, source: 'settled', truth: [capture.settled] };
}

function scoreCapture(capture: Capture, truth: NonNullable<ReturnType<typeof truthOf>>) {
  const found = colorsIn(capture.pixels, defaultRegion(capture.pixels));
  const { reading } = explain(found);
  // An unclear reading offers nothing, so it is scored by the largest color
  // it found: what the reader would have said had it been made to choose.
  // Without that, an unclear reading could never count as a miss it caught.
  const scored =
    reading.kind === 'single'
      ? [reading.color]
      : reading.kind === 'several'
        ? reading.colors.map((c) => c.color)
        : found.slice(0, 1).map((c) => c.color);
  // Each color is matched to the truth color nearest it, and the worst
  // match stands for the reading.
  const distance = scored.length
    ? Math.max(...scored.map((c) => Math.min(...truth.truth.map((t) => oklabDistance(c, t)))))
    : null;
  const verdictRight =
    (reading.kind === 'single' && truth.truth.length === 1) ||
    (reading.kind === 'several' && truth.truth.length > 1);
  return { reading, scored, distance, verdictRight };
}

/**
 * Reads every capture in the set and scores it against its truth. A capture
 * whose garment is no longer in the set, or that has neither a garment nor a
 * settled color, has nothing to be scored against and is counted as skipped.
 */
export function scoreFieldSet(data: FieldExport): { scores: CaptureScore[]; skipped: number } {
  const garments = new Map(data.garments.map((g) => [g.id, g]));
  const scores: CaptureScore[] = [];
  let skipped = 0;
  for (const capture of data.captures) {
    const truth = truthOf(capture, garments);
    if (!truth) {
      skipped++;
      continue;
    }
    const { id, light, lowLight, width, height } = capture;
    scores.push({ id, light, lowLight, width, height, ...truth, ...scoreCapture(capture, truth) });
  }
  return { scores, skipped };
}
