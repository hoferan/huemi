import type { Pixels } from '../model/frame';
import type { Hex } from '../model/hex';
import { clusterColors } from './cluster';
import { rgbToHex } from './convert';
import { oklabToRgb, rgbToOklab, type Oklab } from './oklab';

/**
 * What the harness tunes. None of these are measured yet. They are first
 * guesses from designing #20, to be settled against real photos in the dev
 * harness's `read` mode.
 */
export const READ_TUNING = {
  /** The default circle's radius, as a share of the frame's short side. */
  defaultRadius: 0.2,
  /** The circle read around a tap, as a share of the short side. */
  tapRadius: 0.08,
  /** Most pixels visited per reading. */
  maxSamples: 4096,

  clusters: 4,
  lightnessWeight: 0.5,
  iterations: 12,
  mergeDistance: 0.06,
  seed: 20,

  /** One color covering this share of the region makes it plain. */
  singleMin: 0.7,
  /** A color below this share is not offered as a part of a pattern. */
  partMin: 0.15,
  /** The offered parts must cover this share together. */
  coveredMin: 0.85,
  maxParts: 3,
} as const;

/** A circle in frame pixels. */
export type Region = { cx: number; cy: number; r: number };

export type ColorShare = { color: Hex; share: number };

/**
 * What the camera or a photo says the garment's color is.
 *
 * Each kind is a state of the confirm screen (#21), decided with mocks on
 * 2026-09-24 and recorded on the issue:
 * https://github.com/hoferan/huemi/issues/21#issuecomment-5811836853
 *
 * - `single`: the normal confirm screen.
 * - `several`: a patterned or multicolor garment. The screen shows these
 *   colors, largest share first, and the user picks the one to match
 *   against. Chosen over reading one color silently or with a warning.
 * - `unclear`: no color dominates, usually a busy photo or an off-center
 *   garment. The screen asks the user to tap the garment and reads again
 *   with `tapRegion`. Chosen over guessing among the top colors or refusing
 *   the photo.
 */
export type ColorReading =
  { kind: 'single'; color: Hex } | { kind: 'several'; colors: ColorShare[] } | { kind: 'unclear' };

/**
 * The circle read when the user has not pointed anywhere.
 *
 * The viewfinder is `object-fit: cover` with its guide at `inset: 15%`, so
 * the guide covers a centered crop of the frame. In the worst ordinary case,
 * a 4:3 landscape frame in a 3:4 portrait viewfinder, any radius up to about
 * 0.26 of the short side stays inside it.
 */
export function defaultRegion({ width, height }: Pixels): Region {
  return { cx: width / 2, cy: height / 2, r: READ_TUNING.defaultRadius * Math.min(width, height) };
}

/** The circle read around a tap at (x, y), in frame pixels. */
export function tapRegion({ width, height }: Pixels, x: number, y: number): Region {
  return { cx: x, cy: y, r: READ_TUNING.tapRadius * Math.min(width, height) };
}

// Pixels whose centers fall inside the circle and the frame, at a stride
// that keeps the count under maxSamples. Written so NaN coordinates fail
// every comparison and produce no samples.
function sample({ width, height, data }: Pixels, { cx, cy, r }: Region): Oklab[] {
  if (!(r > 0)) return [];
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(width, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(height, Math.ceil(cy + r));
  if (!(x0 < x1 && y0 < y1)) return [];

  const stride = Math.max(
    1,
    Math.ceil(Math.sqrt(((x1 - x0) * (y1 - y0)) / READ_TUNING.maxSamples)),
  );
  const out: Oklab[] = [];
  for (let y = y0; y < y1; y += stride) {
    for (let x = x0; x < x1; x += stride) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const i = (y * width + x) * 4;
      out.push(rgbToOklab([data[i]!, data[i + 1]!, data[i + 2]!]));
    }
  }
  return out;
}

/** Every color group in the region with its share, largest first. */
export function colorsIn(pixels: Pixels, region: Region = defaultRegion(pixels)): ColorShare[] {
  const points = sample(pixels, region);
  return clusterColors(points, {
    k: READ_TUNING.clusters,
    lightnessWeight: READ_TUNING.lightnessWeight,
    iterations: READ_TUNING.iterations,
    mergeDistance: READ_TUNING.mergeDistance,
    seed: READ_TUNING.seed,
  })
    .sort((a, b) => b.count - a.count)
    .map(({ color, count }) => ({
      color: rgbToHex(oklabToRgb(color)),
      share: count / points.length,
    }));
}

/** The verdict from area shares, largest first. */
export function decide(found: readonly ColorShare[]): ColorReading {
  const [first] = found;
  if (!first) return { kind: 'unclear' };
  if (first.share >= READ_TUNING.singleMin) return { kind: 'single', color: first.color };

  const parts = found.filter((c) => c.share >= READ_TUNING.partMin).slice(0, READ_TUNING.maxParts);
  const covered = parts.reduce((sum, c) => sum + c.share, 0);
  return parts.length >= 2 && covered >= READ_TUNING.coveredMin
    ? { kind: 'several', colors: parts }
    : { kind: 'unclear' };
}

/** Reads the garment's color from a region of the frame. Never throws. */
export function readColor(pixels: Pixels, region: Region = defaultRegion(pixels)): ColorReading {
  return decide(colorsIn(pixels, region));
}
