import type { Hex } from '../model/hex';
import type { Slot, Suggestion } from '../model/types';
import { PALETTE } from './palette';
import { NEUTRAL_CHROMA, chroma, temperature } from './classify';
import { chromaLoad, hueContrast, lightnessContrast } from './score';

/**
 * What the corpus tunes.
 *
 * ADR 0009 settled the shape of this model and left its scale open: the
 * evidence says suggestions should aim at a middle band of coordination and
 * says nothing about where that band sits for clothing. These are a first cut,
 * to be moved by looking at the harness against the corpus in #11. They are
 * gathered here rather than spread through `rate` so that tuning is one edit.
 *
 * The band is a property of the whole model rather than of any one term. An
 * over-coordinated outfit loses on lightness, which rewards separation; a
 * clashing one loses on hue, temperature and the chroma budget. An earlier
 * draft put the band on lightness alone and ranked navy with white fifteenth of
 * eighteen, which is how the mistake showed itself.
 */
export const TUNING = {
  /** Relative pull of each term on the total. */
  weightLightness: 1,
  weightChroma: 0.8,
  weightTemperature: 0.5,
  weightHue: 0.3,

  /** The OKLab lightness gap by which separation has mostly paid off. */
  scaleLightness: 0.35,

  /** Chroma an outfit carries comfortably, and how hard going over is felt. */
  chromaBudget: 0.12,
  spreadChroma: 0.1,

  /** Hue contrast that reads best for the figure, in degrees, and its falloff. */
  targetHue: 60,
  spreadHue: 90,

  /** What a warm piece against a cool one keeps. A penalty, not a veto. */
  mixedTemperature: 0.3,

  /** The chroma by which hue and temperature get their full say. */
  fullChroma: 0.08,
} as const;

/** One at the target, falling away smoothly on both sides. Never a cliff. */
const band = (value: number, target: number, spread: number): number =>
  Math.exp(-(((value - target) / spread) ** 2));

/** Rises with separation and saturates, so more is better with less to gain. */
const rise = (value: number, scale: number): number => 1 - Math.exp(-((value / scale) ** 2));

/** One up to the budget, falling away only above it. */
const within = (value: number, budget: number, spread: number): number =>
  value <= budget ? 1 : Math.exp(-(((value - budget) / spread) ** 2));

/**
 * How much the hue and temperature terms are entitled to say, from the weaker
 * chroma of the pair.
 *
 * A neutral has no temperature to disagree with and no hue worth reading, which
 * is most of why the brief says the real rules lean on neutrals. Ramping that
 * in rather than switching it at `NEUTRAL_CHROMA` is the point: Cream sits at
 * 0.031 against a cutoff of 0.02, and a step function calls it a warm color
 * clashing with a cool one, which is how navy and cream came out below navy on
 * navy. The same cliff at the same boundary is what #38 fixed in `isNeutral`.
 */
function chromaticStrength(base: Hex, candidate: Hex): number {
  const weakest = Math.min(chroma(base), chroma(candidate));
  const ramp = (weakest - NEUTRAL_CHROMA) / (TUNING.fullChroma - NEUTRAL_CHROMA);
  return Math.min(1, Math.max(0, ramp));
}

/** Pull a score back towards 1, by how little the pair has to say. */
const damp = (score: number, strength: number): number => 1 - strength * (1 - score);

function temperatureScore(base: Hex, candidate: Hex): number {
  const agrees = temperature(base) === temperature(candidate);
  return damp(agrees ? 1 : TUNING.mixedTemperature, chromaticStrength(base, candidate));
}

/**
 * Hue contrast read from the candidate's side.
 *
 * The slot being suggested is the figure and the locked base is its ground, and
 * figural preference rises with hue contrast against the background even where
 * preference for the pair as a whole falls (ADR 0009). So this wants a real gap
 * rather than the nearest hue, which is what keeps the engine from collapsing
 * into monochrome.
 */
function hueScore(base: Hex, candidate: Hex): number {
  const gap = hueContrast(base, candidate);
  if (gap === null) return 1;
  return damp(band(gap, TUNING.targetHue, TUNING.spreadHue), chromaticStrength(base, candidate));
}

/**
 * How well one color works in one slot against the locked base. Exported so the
 * harness can show the number beside the color it belongs to, and so the corpus
 * can record what the engine thought at the time.
 */
export function rate(base: Hex, candidate: Hex, slot: Slot, baseSlot: Slot): number {
  const load = chromaLoad({ [baseSlot]: base, [slot]: candidate });
  return (
    TUNING.weightLightness * rise(lightnessContrast(base, candidate), TUNING.scaleLightness) +
    TUNING.weightChroma * within(load, TUNING.chromaBudget, TUNING.spreadChroma) +
    TUNING.weightTemperature * temperatureScore(base, candidate) +
    TUNING.weightHue * hueScore(base, candidate)
  );
}

type Ranked = { suggestion: Suggestion; score: number };

/**
 * Score first, then name.
 *
 * Exported so the tie-break can be asserted directly, the way `contrast.ts`
 * exports its foreground pair. No two palette colors score equal today, so a
 * test driving this through `suggest` never reaches the second clause, and the
 * second clause is the whole point: without it equal scores fall back to the
 * sort's stability, which is to say to the order the palette happens to be
 * written in.
 */
export function byScoreThenName(a: Ranked, b: Ranked): number {
  return b.score - a.score || a.suggestion.name.localeCompare(b.suggestion.name);
}

/**
 * Colors for one slot against a locked base, best first.
 *
 * The whole palette comes back rather than a top few: the suggestions screen
 * offers alternatives for any slot, and where to cut the list is its decision,
 * not the engine's.
 */
export function suggest(base: Hex, slot: Slot, baseSlot: Slot): Suggestion[] {
  return PALETTE.filter((color) => !(slot === baseSlot && color.hex === base))
    .map((color) => ({
      suggestion: { hex: color.hex, name: color.name, slot },
      score: rate(base, color.hex, slot, baseSlot),
    }))
    .sort(byScoreThenName)
    .map((ranked) => ranked.suggestion);
}
