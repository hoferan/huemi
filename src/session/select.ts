import { suggest } from '../color/engine';
import type { Hex } from '../model/hex';
import type { Slot } from '../model/types';
import type { Base } from './types';

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
 */
export function positionLabel(cursor: number, count: number): string {
  return `${wrap(cursor, count) + 1} of ${count}`;
}
