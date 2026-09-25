import type { Hex } from './hex';

export type Slot = 'outerwear' | 'top' | 'bottom' | 'shoes' | 'accessory';

export const SLOTS: readonly Slot[] = ['outerwear', 'top', 'bottom', 'shoes', 'accessory'];

/** The slots an outfit check reads, head to toe. Rating leaves out accessories (#23). */
export type CheckSlot = Exclude<Slot, 'accessory'>;

export const CHECK_SLOTS: readonly CheckSlot[] = ['outerwear', 'top', 'bottom', 'shoes'];

export const SLOT_LABELS: Readonly<Record<Slot, string>> = {
  outerwear: 'Outerwear',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  accessory: 'Accessory',
};

export type Garment = {
  id: string;
  slot: Slot;
  hex: Hex;
  name: string;
  source: 'camera' | 'photo' | 'picker' | 'link';
  photoRef?: string;
  /** The camera's reading, when the user corrected it. Training data. */
  correctedFrom?: Hex;
};

export type Outfit = {
  /** Bump when the shape changes. The slot list is still an open question. */
  version: 1;
  id: string;
  name: string;
  note?: string;
  createdAt: string;
  baseSlot: Slot;
  /**
   * Hexes, never indices into a suggestion list — indices break when the
   * algorithm changes, and the prototype's are unstable even within one run.
   * Partial because not every slot is always filled, and pieces[baseSlot]
   * IS populated.
   */
  pieces: Partial<Record<Slot, Hex>>;
};

export type Suggestion = {
  hex: Hex;
  name: string;
  slot: Slot;
};

/**
 * Roughly how much of an outfit each slot covers, used to weight the chroma
 * budget (ADR 0009). What is load-bearing here is the ordering, which is what
 * Moon and Spencer's area finding actually licenses: a coat carries more color
 * than a bag. The magnitudes are a first cut, tuned against the corpus in #11,
 * and a test pins the ordering so tuning cannot quietly invert it.
 */
export const SLOT_AREA: Readonly<Record<Slot, number>> = {
  outerwear: 1,
  top: 0.8,
  bottom: 0.8,
  shoes: 0.15,
  accessory: 0.05,
};
