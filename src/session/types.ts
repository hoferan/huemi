import type { Hex } from '../model/hex';
import type { Slot } from '../model/types';

/** The garment the user started from. Always populated once a colour is picked. */
export type Base = { slot: Slot; hex: Hex };

export type ToastAction = { label: string; kind: 'undoDelete'; outfitId: string };

export type Toast = { id: number; message: string; action?: ToastAction };

export type SessionState = {
  base: Base | null;
  /**
   * The colour currently shown for each slot. Hexes, not indices into a
   * suggestion list: a saved outfit holds hexes, so anything else would mean
   * inverting the engine to reopen one (ADR 0005).
   */
  picks: Partial<Record<Slot, Hex>>;
  /**
   * Where the swipe has got to for each slot. Unbounded and possibly
   * negative; `select.ts` wraps it. Not the source of truth for the colour,
   * only for the position, which the block announces as text.
   */
  cursor: Partial<Record<Slot, number>>;
  /** Hold-to-keep. Present and true, or absent. */
  locked: Partial<Record<Slot, true>>;
  /** One at a time. A new toast replaces the current one. */
  toast: Toast | null;
  /** Monotonic, so toast ids are assigned in here rather than by a caller. */
  toastSeq: number;
};

export type SessionAction =
  | { type: 'baseChosen'; slot: Slot; hex: Hex }
  | { type: 'pickChanged'; slot: Slot; hex: Hex; cursor: number }
  | { type: 'lockToggled'; slot: Slot }
  | {
      type: 'outfitLoaded';
      base: Base;
      picks: Partial<Record<Slot, Hex>>;
      cursor: Partial<Record<Slot, number>>;
    }
  | { type: 'toastShown'; message: string; action?: ToastAction }
  | { type: 'toastDismissed'; id: number }
  | { type: 'reset' };
