import type { Hex } from '../model/hex';
import type { Slot, Suggestion } from '../model/types';
import { PALETTE } from './palette';
import { oklabDistance } from './oklab';
import { NEUTRAL_CHROMA, chroma, temperature } from './classify';
import { chromaLoad, hueContrast, lightnessContrast } from './score';

/**
 * What the corpus tunes.
 *
 * ADR 0009 settled the shape of this model and left its scale open, to be
 * closed by looking at the harness. ADR 0010 closed it against 17,316 Polyvore
 * outfits instead, and found the lightness term was the wrong shape rather than
 * merely the wrong scale: real outfits are more coordinated than random pairs,
 * not less, and the ramp that used to sit here rewarded separation without
 * limit. Measured as lift over random pairs, real outfits run 1.63 at a
 * near-zero lightness gap and 0.90, 0.81, 0.83, 1.03, 0.68, 0.66, 0.71 across
 * the rest of the range.
 *
 * Only `tonalLightness` and `spreadLightness` come from that measurement. The
 * rest are still ADR 0009's first cut, deliberately: fitting all thirteen
 * against the same data moved compatibility AUC by 0.002 and the blank-filling
 * benchmark not at all, so the extra freedom bought nothing a reader would have
 * to take on trust.
 */
export const TUNING = {
  /** Relative pull of each term on the total. */
  weightLightness: 1,
  weightChroma: 0.8,
  weightTemperature: 0.5,
  weightHue: 0.3,

  /** Where the tonal template peaks, and how fast it falls away. */
  tonalLightness: 0.05,
  spreadLightness: 0.14,

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
    TUNING.weightLightness *
      band(lightnessContrast(base, candidate), TUNING.tonalLightness, TUNING.spreadLightness) +
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
 * Below this OKLab distance from the base, a suggestion is not one.
 *
 * ADR 0010 made a tonal pairing the highest-scoring shape, which is what the
 * data says stylists do. Taken literally that ranks Light grey first against a
 * White base, and a user who is shown a colour they cannot tell from the one
 * they already have has been given nothing. The palette's own entries sit 0.031
 * to 0.125 apart, so this sits at the bottom of that range: it catches White
 * against Light grey at 0.051 and leaves every deliberate tonal pairing alone,
 * because two colours a tonal gap apart in lightness are further than this once
 * their hues differ at all.
 */
const NEAR_DUPLICATE = 0.06;

/**
 * Colors for one slot against a locked base, best first.
 *
 * The whole palette comes back rather than a top few: the suggestions screen
 * offers alternatives for any slot, and where to cut the list is its decision,
 * not the engine's. Near-duplicates of the base go last whatever they scored,
 * which is a statement about what a suggestion is for rather than about colour,
 * and so is kept out of `rate` where the colour reasoning lives.
 */
export function suggest(base: Hex, slot: Slot, baseSlot: Slot): Suggestion[] {
  return PALETTE.filter((color) => !(slot === baseSlot && color.hex === base))
    .map((color) => ({
      suggestion: { hex: color.hex, name: color.name, slot },
      score: rate(base, color.hex, slot, baseSlot),
      duplicate: oklabDistance(base, color.hex) < NEAR_DUPLICATE,
    }))
    .sort((a, b) => Number(a.duplicate) - Number(b.duplicate) || byScoreThenName(a, b))
    .map((ranked) => ranked.suggestion);
}
