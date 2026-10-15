import type { Hex } from './hex';
import { SLOTS, type Slot } from './types';

/** The pieces an outfit can leave out. */
export type OptionalSlot = 'outerwear' | 'accessory';

export const OPTIONAL_SLOTS: readonly OptionalSlot[] = ['outerwear', 'accessory'];

/**
 * Which pieces an outfit wears. Outerwear and the accessory can be left out.
 * The body is a top and a bottom, or a dress in their place (#136), so `dress`
 * picks between the two and no shape can wear both or neither. Shoes are
 * always worn and have no field. A piece that is not worn takes no color name
 * and no chroma budget (ADR 0021).
 */
export type Shape = { outerwear: boolean; accessory: boolean; dress: boolean };

/** Every optional piece, with a top and a bottom. How huemi behaved before shapes. */
export const FULL_SHAPE: Shape = Object.freeze({ outerwear: true, accessory: true, dress: false });

export const isOptional = (slot: Slot): slot is OptionalSlot =>
  (OPTIONAL_SLOTS as readonly Slot[]).includes(slot);

export function isWorn(shape: Shape, slot: Slot): boolean {
  if (isOptional(slot)) return shape[slot];
  if (slot === 'dress') return shape.dress;
  if (slot === 'top' || slot === 'bottom') return !shape.dress;
  return true;
}

/** The slots the shape wears, head to toe. */
export function wornSlots(shape: Shape): Slot[] {
  return SLOTS.filter((slot) => isWorn(shape, slot));
}

/**
 * Whether the base settles the dress: a top or a bottom needs the other half,
 * and a dress base is the dress. Null when the base leaves it open.
 */
export function dressFixedBy(baseSlot: Slot): boolean | null {
  if (baseSlot === 'dress') return true;
  if (baseSlot === 'top' || baseSlot === 'bottom') return false;
  return null;
}

/** The shape a new outfit starts with: the remembered preference, with the base always worn. */
export function shapeFor(baseSlot: Slot, preference: Shape): Shape {
  const shape = { ...preference, dress: dressFixedBy(baseSlot) ?? preference.dress };
  return isOptional(baseSlot) ? { ...shape, [baseSlot]: true } : shape;
}

/**
 * The shape of a saved outfit: an optional piece or a dress is worn when the
 * outfit has one, or when it is the base.
 */
export function shapeOf(pieces: Partial<Record<Slot, Hex>>, baseSlot: Slot): Shape {
  const has = (slot: OptionalSlot) => slot === baseSlot || pieces[slot] !== undefined;
  return {
    outerwear: has('outerwear'),
    accessory: has('accessory'),
    dress: dressFixedBy(baseSlot) ?? pieces.dress !== undefined,
  };
}

/**
 * A dress worn with a top or a bottom. Nothing huemi writes has one, so a
 * stored outfit or a link that does was not written by huemi, and reading it
 * would show the body twice.
 */
export function dressBesideSeparates(pieces: Partial<Record<Slot, Hex>>): boolean {
  return pieces.dress !== undefined && (pieces.top !== undefined || pieces.bottom !== undefined);
}
