import type { Hex } from './hex';

export type Slot = 'outerwear' | 'top' | 'bottom' | 'shoes' | 'accessory';

export const SLOTS: readonly Slot[] = ['outerwear', 'top', 'bottom', 'shoes', 'accessory'];

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
