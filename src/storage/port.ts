import type { Hex } from '../model/hex';
import type { Outfit, Slot } from '../model/types';

/**
 * Results, not exceptions. Storage fails in ordinary ways — private mode
 * throws on localStorage, persisted JSON goes malformed — and those are user
 * conditions, not programmer errors.
 */
export type StorageResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * Interfaces below differ in their return types: OutfitStore methods return
 * StorageResult because a save failure is user-visible and the caller must act
 * on it. PreferenceStore and CorrectionLog return bare promises: preference
 * failures degrade gracefully (onboarding shows again next visit), and
 * correction failures lose a training signal but do not change the screen.
 */
export interface OutfitStore {
  list(): Promise<StorageResult<Outfit[]>>;
  save(outfit: Outfit): Promise<StorageResult<void>>;
  remove(id: string): Promise<StorageResult<void>>;
}

export interface PreferenceStore {
  hasOnboarded(): Promise<boolean>;
  setOnboarded(value: boolean): Promise<void>;
}

/** Camera reading versus the user's correction. Training data for the reader. */
export interface CorrectionLog {
  record(entry: { slot: Slot; read: Hex; corrected: Hex; at: string }): Promise<void>;
}
