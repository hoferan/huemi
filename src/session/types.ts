import type { Hex } from '../model/hex';
import type { Outfit, Slot } from '../model/types';

/** The garment the user started from. Always populated once a colour is picked. */
export type Base = { slot: Slot; hex: Hex };

/**
 * Outfits are stored complete, with their id and createdAt, so Undo can restore
 * them unchanged after deletion and they return to their original place.
 */
export type ToastAction = { label: string; kind: 'undoDelete'; outfits: Outfit[] };

export type Toast = { id: number; message: string; action?: ToastAction; focusAction?: true };

/**
 * What is showing in one slot.
 *
 * The hex is the colour, not an index into a suggestion list: a saved outfit
 * holds hexes, so anything else would mean inverting the engine to reopen one
 * (ADR 0005). The cursor is where the swipe has got to, unbounded and
 * possibly negative, wrapped by `select.ts`.
 *
 * One record rather than two parallel maps, because a cursor that belongs to
 * a different colour than the one on screen is a state nothing can repair:
 * the block would announce the wrong "n of 18" and no test could tell. An
 * absent cursor means the position is unknown, which is what `locate` reports
 * by returning null, and the block then says nothing about the position
 * rather than saying something false.
 */
export type SlotPick = { hex: Hex; cursor?: number };

export type SessionState = {
  base: Base | null;
  /** The colour showing in each slot, and where it came from. */
  picks: Partial<Record<Slot, SlotPick>>;
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
  | { type: 'outfitLoaded'; base: Base; picks: Partial<Record<Slot, SlotPick>> }
  | { type: 'picksReplaced'; picks: Partial<Record<Slot, SlotPick>> }
  | { type: 'toastShown'; message: string; action?: ToastAction; focusAction?: true }
  | { type: 'toastDismissed'; id: number }
  | { type: 'reset' };
