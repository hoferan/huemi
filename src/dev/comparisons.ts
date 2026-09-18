import { parseHex, type Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { rate, suggest } from '../color/engine';

/**
 * One question: two candidates for the same slot against the same locked base.
 *
 * Forced choice rather than a rating, because "which would you rather wear"
 * needs no styling expertise, and because it is the question the evidence this
 * engine rests on was gathered with. Gray and others measured coordination by
 * asking people to rate pairs, not by asking experts and not by any color
 * metric; Schloss and Palmer did the same for pair preference (ADR 0009).
 *
 * An answer is one ordering constraint on `suggest`, which is what the corpus
 * asserts. Absolute scores are deliberately not asked for: they would have to
 * be rewritten every time TUNING moves.
 */
export type Comparison = {
  id: string;
  base: Hex;
  baseSlot: Slot;
  slot: Slot;
  left: Hex;
  right: Hex;
  /** The engine's rank and score for each side, recorded but never shown. */
  leftRank: number;
  rightRank: number;
  leftScore: number;
  rightScore: number;
};

export type Verdict = 'left' | 'right' | 'none';

export type Answer = Comparison & { verdict: Verdict };

/**
 * The contexts judged, spread across the palette so no one region of it
 * decides the scale.
 *
 * Each picks a base with a different character: dark and cool, light and warm,
 * a pure neutral, the two most saturated entries, and a mid-chroma pair. The
 * slot pairings vary area as well, because the chroma budget is area weighted
 * and a scarf against a coat is a different question from a top against a
 * bottom (SLOT_AREA, ADR 0009).
 */
const CONTEXTS: readonly { base: string; baseSlot: Slot; slot: Slot }[] = [
  { base: '#1f2a44', baseSlot: 'bottom', slot: 'top' },
  { base: '#e9dfc9', baseSlot: 'top', slot: 'bottom' },
  { base: '#8a8a8a', baseSlot: 'top', slot: 'bottom' },
  { base: '#a4522d', baseSlot: 'top', slot: 'bottom' },
  { base: '#4a6285', baseSlot: 'outerwear', slot: 'top' },
  { base: '#b58a5a', baseSlot: 'bottom', slot: 'shoes' },
  { base: '#2f4a3a', baseSlot: 'outerwear', slot: 'bottom' },
  { base: '#c39a3a', baseSlot: 'top', slot: 'accessory' },
];

/**
 * Which ranks in the engine's current order get compared.
 *
 * The distant pairs ask whether the engine has the direction right at all. The
 * adjacent ones ask where the boundary sits, which is the part the literature
 * leaves open and the part a wide pair cannot answer.
 */
const OFFSETS: readonly (readonly [number, number])[] = [
  [0, 17],
  [0, 8],
  [2, 3],
  [5, 12],
  [9, 10],
];

/**
 * Every comparison, in a fixed order so a session can be repeated.
 *
 * The better-ranked candidate alternates between the two sides. Left would
 * otherwise always be the engine's preference, which teaches the pattern within
 * a few questions and turns the rest of the session into agreement with it.
 */
export function buildComparisons(): Comparison[] {
  const out: Comparison[] = [];

  CONTEXTS.forEach(({ base, baseSlot, slot }, context) => {
    const hex = parseHex(base);
    const ranked = suggest(hex, slot, baseSlot);

    OFFSETS.forEach(([better, worse], offset) => {
      const a = ranked[better];
      const b = ranked[worse];
      if (!a || !b) return;

      const flip = (context + offset) % 2 === 1;
      const [left, leftRank, right, rightRank] = flip
        ? [b.hex, worse, a.hex, better]
        : [a.hex, better, b.hex, worse];

      out.push({
        id: `${base.slice(1)}-${slot}-${better}v${worse}`,
        base: hex,
        baseSlot,
        slot,
        left,
        right,
        leftRank,
        rightRank,
        leftScore: rate(hex, left, slot, baseSlot),
        rightScore: rate(hex, right, slot, baseSlot),
      });
    });
  });

  return out;
}
