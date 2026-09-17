import type { Hex } from '../model/hex';
import { SLOTS, SLOT_AREA, type Slot } from '../model/types';
import { hexToOklch } from './oklab';
import { isNeutral, temperature } from './classify';

type Pieces = Partial<Record<Slot, Hex>>;
type Areas = Readonly<Record<Slot, number>>;

/**
 * The scoring primitives the engine composes, each a measurement rather than a
 * judgement. No threshold lives here: ADR 0009 leaves where the middle band of
 * coordination sits to be settled against the corpus in #11, and a cutoff
 * chosen now would pre-empt that.
 */

/** Absolute difference in OKLab lightness, 0 to 1. */
export function lightnessContrast(a: Hex, b: Hex): number {
  return Math.abs(hexToOklch(a).l - hexToOklch(b).l);
}

/**
 * Shortest angular distance between two hues, 0 to 180 degrees.
 *
 * Null when either color is neutral, because a neutral's hue is rounding noise.
 * The union rather than a zero is deliberate: zero would read as "identical
 * hues" and quietly score a grey as matching everything.
 */
export function hueContrast(a: Hex, b: Hex): number | null {
  if (isNeutral(a) || isNeutral(b)) return null;
  const gap = Math.abs(hexToOklch(a).h - hexToOklch(b).h);
  return gap > 180 ? 360 - gap : gap;
}

/**
 * How much color an outfit carries, each piece's chroma weighted by the area of
 * its slot. This is the cap on saturated colors the brief asks for, counted by
 * area instead of by piece: a count treats a scarf and a coat alike when the
 * eye does not (ADR 0009).
 */
export function chromaLoad(pieces: Pieces, areas: Areas = SLOT_AREA): number {
  let load = 0;
  for (const slot of SLOTS) {
    const hex = pieces[slot];
    if (hex) load += hexToOklch(hex).c * areas[slot];
  }
  return load;
}

/** How the pieces divide into warm, cool and neutral. */
export function temperatureMix(pieces: Pieces): { warm: number; cool: number; neutral: number } {
  const mix = { warm: 0, cool: 0, neutral: 0 };
  for (const slot of SLOTS) {
    const hex = pieces[slot];
    if (hex) mix[temperature(hex)] += 1;
  }
  return mix;
}
