import type { Hex } from './hex';
import { SLOTS, type Slot } from './types';

/** The pieces an outfit can leave out. */
export type OptionalSlot = 'outerwear' | 'accessory';

export const OPTIONAL_SLOTS: readonly OptionalSlot[] = ['outerwear', 'accessory'];

/**
 * Which optional pieces an outfit wears. Shoes, top and bottom are always
 * worn, so they have no field and no shape can leave them out. A piece that is
 * not worn takes no color name and no chroma budget (ADR 0021).
 */
export type Shape = { outerwear: boolean; accessory: boolean };

export const FULL_SHAPE: Shape = Object.freeze({ outerwear: true, accessory: true });

export const isOptional = (slot: Slot): slot is OptionalSlot =>
  (OPTIONAL_SLOTS as readonly Slot[]).includes(slot);

export function isWorn(shape: Shape, slot: Slot): boolean {
  return isOptional(slot) ? shape[slot] : true;
}

/** The slots the shape wears, head to toe. */
export function wornSlots(shape: Shape): Slot[] {
  return SLOTS.filter((slot) => isWorn(shape, slot));
}

/** The shape a new outfit starts with: the remembered preference, with the base always worn. */
export function shapeFor(baseSlot: Slot, preference: Shape): Shape {
  return isOptional(baseSlot) ? { ...preference, [baseSlot]: true } : { ...preference };
}

/**
 * The shape of a saved outfit: an optional piece is worn when the outfit has
 * one, or when it is the base.
 */
export function shapeOf(pieces: Partial<Record<Slot, Hex>>, baseSlot: Slot): Shape {
  const has = (slot: OptionalSlot) => slot === baseSlot || pieces[slot] !== undefined;
  return { outerwear: has('outerwear'), accessory: has('accessory') };
}
