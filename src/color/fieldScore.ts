import { LIGHTS, type FieldExport, type FieldGarment, type Light } from '../model/field';
import type { Hex } from '../model/hex';
import { oklabDistance } from './oklab';
import { colorsIn, defaultRegion, explain, type ColorReading } from './read';

/**
 * How far off, in OKLab, a reading has to be before it counts as wrong.
 *
 * It starts at the same number as the clusterer's `mergeDistance`, but the
 * two are measured differently: the clusterer weighs lightness at 0.35, so
 * it merges colors up to about 0.17 apart in lightness alone, while this is
 * plain OKLab distance. A reading 0.07 too light counts as wrong here even
 * though the reader would not have told the two apart. It is written out as
 * a literal so that retuning the clusterer leaves the yardstick where it is.
 * M10 decides whether it stays.
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
  // That way an unclear reading whose best guess was close counts as right,
  // and only one that was also off counts as a miss it caught.
  const scored =
    reading.kind === 'single'
      ? [reading.color]
      : reading.kind === 'several'
        ? reading.colors.map((c) => c.color)
        : found.slice(0, 1).map((c) => c.color);
  // Each color is matched to the truth color nearest it. Against a garment,
  // every part offered has to be one of its colors, so the worst match
  // stands for the reading. A settled color is the one part the user chose
  // from what was offered, so there the best match does.
  const matches = scored.map((c) => Math.min(...truth.truth.map((t) => oklabDistance(c, t))));
  const distance = matches.length
    ? truth.source === 'settled'
      ? Math.min(...matches)
      : Math.max(...matches)
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

/** How the reader did across a group of captures. */
export type Summary = {
  count: number;
  /** Over the captures that have a distance; null when none has. */
  median: number | null;
  p90: number | null;
  worst: number | null;
  /** The share of captures where one or several was the right call. */
  verdictRight: number;
  /** Captures further off than `WRONG_AT`, or with no reading to measure. */
  wrong: number;
  /**
   * The share of `wrong` that the viewfinder's low-light warning or an
   * unclear verdict flagged to the user. Null when nothing was wrong.
   */
  caught: number | null;
};

// Nearest rank, so the median of an even count is the lower middle, as the
// reader's own median is.
const percentile = (sorted: readonly number[], p: number): number | null =>
  sorted.length ? sorted[Math.ceil(p * sorted.length) - 1]! : null;

export function summarize(scores: readonly CaptureScore[]): Summary {
  const distances = scores
    .flatMap((s) => (s.distance === null ? [] : [s.distance]))
    .sort((a, b) => a - b);
  const wrong = scores.filter((s) => s.distance === null || s.distance > WRONG_AT);
  const caught = wrong.filter((s) => s.lowLight === true || s.reading.kind === 'unclear');
  return {
    count: scores.length,
    median: percentile(distances, 0.5),
    p90: percentile(distances, 0.9),
    worst: distances.at(-1) ?? null,
    verdictRight: scores.length ? scores.filter((s) => s.verdictRight).length / scores.length : 0,
    wrong: wrong.length,
    caught: wrong.length ? caught.length / wrong.length : null,
  };
}

const distanceText = (n: number | null) => (n === null ? '–' : n.toFixed(3));
const shareText = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`);

// One table: a heading, the column names, then a row per light that has
// captures, in the order of LIGHTS, and a row for all of them.
function table(heading: string, scores: readonly CaptureScore[], full: boolean): string[] {
  if (!scores.length) return [heading, 'none'];
  const columns = ['light', 'n', 'median', 'p90', 'worst'].concat(
    full ? ['verdict', 'wrong', 'caught'] : [],
  );
  const cells = (label: string, s: Summary) =>
    [
      label,
      String(s.count),
      distanceText(s.median),
      distanceText(s.p90),
      distanceText(s.worst),
    ].concat(full ? [shareText(s.verdictRight), String(s.wrong), shareText(s.caught)] : []);
  const groups: [string, readonly CaptureScore[]][] = LIGHTS.map(
    (light): [string, readonly CaptureScore[]] => [light, scores.filter((s) => s.light === light)],
  ).filter(([, group]) => group.length);
  groups.push(['all', scores]);
  const rows = [columns, ...groups.map(([label, group]) => cells(label, summarize(group)))];
  const widths = columns.map((_, i) => Math.max(...rows.map((r) => r[i]!.length)));
  const line = (r: string[]) =>
    r.map((cell, i) => (i === 0 ? cell.padEnd(widths[i]!) : cell.padStart(widths[i]!))).join('  ');
  return [heading, ...rows.map(line)];
}

/**
 * The benchmark's printout: the reader against the garments' true colors,
 * per light, then against the colors settled in normal use, which went
 * through the same camera and so only show distance.
 */
export function fieldReport(scores: readonly CaptureScore[], skipped: number): string {
  return [
    ...table(
      "Against the garment's true colors",
      scores.filter((s) => s.source === 'garment'),
      true,
    ),
    '',
    ...table(
      'Against the color settled in use (weaker truth)',
      scores.filter((s) => s.source === 'settled'),
      false,
    ),
    ...(skipped
      ? ['', `Skipped ${skipped} capture${skipped === 1 ? '' : 's'} with nothing to score against.`]
      : []),
  ].join('\n');
}
