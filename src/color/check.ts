import type { Hex } from '../model/hex';
import { CHECK_SLOTS, SLOT_AREA, type CheckSlot } from '../model/types';
import { chroma, isNeutral, temperature } from './classify';
import { TUNING } from './engine';
import { hexToOklch } from './oklab';
import { chromaLoad, lightnessContrast } from './score';

/** The pieces of an outfit being checked. Accessories are left out (#23). */
export type WornPieces = Partial<Record<CheckSlot, Hex>>;

export type WornPiece = { slot: CheckSlot; hex: Hex };

/**
 * One thing the check noticed, and the pieces it is about.
 *
 * Data, not words: the sentences live with the check screen's copy, so the
 * wording can change without touching the reasoning, and the reasoning can be
 * tested without matching on sentences.
 */
export type Observation =
  | { term: 'color'; kind: 'neutral'; pieces: [] }
  | { term: 'color'; kind: 'quiet' | 'colorful'; pieces: [WornPiece] }
  | { term: 'temperature'; kind: 'warm' | 'cool'; pieces: WornPiece[] }
  | { term: 'temperature'; kind: 'mixed'; pieces: [WornPiece, WornPiece] }
  | { term: 'lightness'; kind: 'tonal'; pieces: WornPiece[] }
  | { term: 'lightness'; kind: 'contrast'; pieces: [WornPiece, WornPiece] };

/** The pieces that are there, head to toe. The order is what breaks ties. */
function worn(pieces: WornPieces): WornPiece[] {
  return CHECK_SLOTS.flatMap((slot) => {
    const hex = pieces[slot];
    return hex ? [{ slot, hex }] : [];
  });
}

/** How much color a piece puts into the outfit, weighted by how much of it the piece covers. */
const carried = (piece: WornPiece): number => chroma(piece.hex) * SLOT_AREA[piece.slot];

/** The piece carrying the most color. Ties go to the one higher up the body. */
function heaviest(pieces: WornPiece[]): WornPiece {
  return pieces.reduce((best, piece) => (carried(piece) > carried(best) ? piece : best));
}

/**
 * The composer's chroma budget is the line between quiet and colorful here,
 * as a description only. It is where the composer stops adding color to a
 * suggestion (ADR 0012), which makes it a fair word for "a lot", and it says
 * nothing about whether a lot is wrong.
 */
function colorObservation(present: WornPiece[], pieces: WornPieces): Observation {
  if (present.every((piece) => isNeutral(piece.hex))) {
    return { term: 'color', kind: 'neutral', pieces: [] };
  }
  const kind = chromaLoad(pieces) > TUNING.chromaBudget ? 'colorful' : 'quiet';
  return { term: 'color', kind, pieces: [heaviest(present)] };
}

/**
 * Which side the colors sit on. The engine damps a faint color's temperature
 * before it penalizes a warm and cool pair. A description has nothing to
 * penalize, so Cream counts as the warm color it is.
 */
function temperatureObservation(present: WornPiece[]): Observation | null {
  const colored = present.filter((piece) => !isNeutral(piece.hex));
  if (colored.length < 2) return null;
  const warm = colored.filter((piece) => temperature(piece.hex) === 'warm');
  const cool = colored.filter((piece) => temperature(piece.hex) === 'cool');
  if (cool.length === 0) return { term: 'temperature', kind: 'warm', pieces: colored };
  if (warm.length === 0) return { term: 'temperature', kind: 'cool', pieces: colored };
  return { term: 'temperature', kind: 'mixed', pieces: [heaviest(warm), heaviest(cool)] };
}

/**
 * The boundary is the fitted lightness curve's own width. This only
 * describes, and ADR 0010 found real outfits run tonal and spread alike.
 */
function lightnessObservation(present: WornPiece[]): Observation {
  const l = (piece: WornPiece) => hexToOklch(piece.hex).l;
  const lightest = present.reduce((best, piece) => (l(piece) > l(best) ? piece : best));
  const darkest = present.reduce((best, piece) => (l(piece) < l(best) ? piece : best));
  const tonal = TUNING.tonalLightness + TUNING.spreadLightness;
  if (lightnessContrast(lightest.hex, darkest.hex) <= tonal) {
    return { term: 'lightness', kind: 'tonal', pieces: present };
  }
  return { term: 'lightness', kind: 'contrast', pieces: [lightest, darkest] };
}

/**
 * How an outfit someone is wearing works together, as the engine sees it:
 * how much color there is and which piece carries it, warm and cool, light
 * and dark.
 *
 * It describes and never judges. In Polyvore's human-labelled outfits, the
 * ones people said work carry more color and mix warm and cool more often
 * than the ones they said do not, so a flag built on either would point at
 * good outfits more than bad ones (ADR 0014). There is no number either: the
 * engine's total has no calibrated scale (ADR 0009).
 *
 * Null under two pieces, so a caller cannot describe an outfit that is not
 * there, such as a refreshed result whose session lost it.
 */
export function checkOutfit(pieces: WornPieces): Observation[] | null {
  const present = worn(pieces);
  if (present.length < 2) return null;
  const warmth = temperatureObservation(present);
  return [
    colorObservation(present, pieces),
    ...(warmth ? [warmth] : []),
    lightnessObservation(present),
  ];
}
