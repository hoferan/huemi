import { suggest, TUNING } from '../color/engine';
import { chroma } from '../color/classify';
import { colorName } from '../color/palette';
import { chromaLoad } from '../color/score';
import type { Hex } from '../model/hex';
import { SLOTS, type Slot } from '../model/types';
import type { Base, SlotPick } from './types';
import type { Suggestion } from '../model/types';

export type Position = { hex: Hex; cursor: number; count: number };

/**
 * Floored modulo. The remainder operator keeps the sign of the dividend, so
 * `-1 % 18` is `-1` and a backwards swipe would index off the front of the
 * list.
 */
function wrap(value: number, length: number): number {
  return ((value % length) + length) % length;
}

/**
 * The join between the session and the engine, and the only file in
 * `src/session/` that imports `src/color/`.
 *
 * Features call this and dispatch what it returns, rather than the reducer
 * calling `suggest()` itself. That keeps the reducer a plain data transform
 * and keeps the engine out of every session test.
 */
export function advance(base: Base, slot: Slot, cursor: number, delta: number): Position {
  const list = suggest(base.hex, slot, base.slot);
  const next = cursor + delta;
  const entry = list[wrap(next, list.length)];
  if (!entry) throw new Error(`The engine returned no suggestions for ${slot}`);
  return { hex: entry.hex, cursor: next, count: list.length };
}

/**
 * Where a colour sits in a slot's suggestion list.
 *
 * Reopening a saved outfit is the reason this exists: outfits hold hexes and
 * the block announces a position, so the hex has to be found again. Every
 * non-base piece came from `suggest()`, which returns palette colours only, so
 * the lookup succeeds. It returns null rather than guessing if it ever does
 * not, and the caller omits the position instead of claiming a wrong one.
 */
export function locate(base: Base, slot: Slot, hex: Hex): Position | null {
  const list = suggest(base.hex, slot, base.slot);
  const at = list.findIndex((candidate) => candidate.hex === hex);
  if (at === -1) return null;
  return { hex, cursor: at, count: list.length };
}

/**
 * The text equivalent of the swipe position. The prototype conveys it through
 * dot opacity alone, which says nothing to a screen reader and nothing to
 * anyone who cannot separate the dots by brightness.
 *
 * An empty list has no position to describe, so the label is empty and the
 * block renders nothing where the indicator would go. `suggest()` cannot
 * return an empty list for real palette data, and `advance` throws if it ever
 * does, so this only guards against a caller passing a count of its own. It
 * is one line because the alternative reaches the user: `% 0` is NaN, and
 * this string is read aloud.
 */
export function positionLabel(cursor: number, count: number): string {
  if (count < 1) return '';
  return `${wrap(cursor, count) + 1} of ${count}`;
}

/**
 * The five pieces of an outfit, chosen together.
 *
 * `suggest()` scores one candidate against the base, and the slot reaches that
 * score only through `SLOT_AREA` weighting the chroma term, which moves the
 * ranking very little. So every slot's list comes back in nearly the same
 * order, and taking each slot's best gives four identical blocks. Something
 * above the engine has to choose the pieces as a set; this is it (ADR 0012).
 *
 * Two constraints, in this order. A colour whose name is already on screen is
 * skipped, because two blocks reading "Rust" say nothing about how they differ
 * and the name is the only non-colour channel a colour-vision-deficient user
 * has. Then the area-weighted chroma budget, which ADR 0009 calls the cap on
 * saturated colours and which `rate()` can only apply to two pieces at a time.
 *
 * `random` is a parameter rather than a call to `Math.random` so that seeding
 * can pass `() => 0` and be deterministic. That determinism is load-bearing:
 * only the base travels in the URL, so a refresh of `/suggest` rebuilds the
 * same starting outfit rather than a different one. It rebuilds the seed, not
 * whatever was on screen: a shuffle and a Next press both live in the session,
 * and a refresh discards them.
 */
export function composeOutfit(
  base: Base,
  fixed: Partial<Record<Slot, SlotPick>>,
  random: () => number,
): Partial<Record<Slot, SlotPick>> {
  const picks: Partial<Record<Slot, SlotPick>> = {};
  const pieces: Partial<Record<Slot, Hex>> = { [base.slot]: base.hex };
  const names = new Set<string>([colorName(base.hex)]);

  // Pre-register all fixed slots so that free slots can see and avoid them,
  // regardless of order in SLOTS.
  for (const slot of SLOTS) {
    if (slot === base.slot) continue;
    const held = fixed[slot];
    if (!held) continue;
    picks[slot] = held;
    pieces[slot] = held.hex;
    names.add(colorName(held.hex));
  }

  for (const slot of SLOTS) {
    if (slot === base.slot || fixed[slot]) continue;

    const list = suggest(base.hex, slot, base.slot);
    // Rotating rather than sampling: the walk still runs in rank order from
    // wherever it starts, so shuffle gets a different outfit without giving up
    // the ranking that makes the list worth walking.
    const offset = Math.floor(random() * list.length) % list.length;
    const rotated = list.map((_, index) => list[(offset + index) % list.length]!);

    const fresh = rotated.filter((entry) => !names.has(colorName(entry.hex)));
    const within = fresh.find(
      (entry) => chromaLoad({ ...pieces, [slot]: entry.hex }) <= TUNING.chromaBudget,
    );
    // Reachable: a chromatic base in a large slot spends the whole budget by
    // itself, and then nothing can bring the outfit back under it. The quietest
    // colour is the least bad answer, not the highest-ranked one.
    const quietest = fresh.reduce<Suggestion | undefined>(
      (best, entry) => (best && chroma(best.hex) <= chroma(entry.hex) ? best : entry),
      undefined,
    );
    // Only reachable with a palette smaller than the slot count. It exists so
    // the function is total and never returns a slot with no colour.
    const chosen = within ?? quietest ?? rotated[0]!;

    picks[slot] = { hex: chosen.hex, cursor: list.indexOf(chosen) };
    pieces[slot] = chosen.hex;
    names.add(colorName(chosen.hex));
  }

  return picks;
}
