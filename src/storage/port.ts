import type { Outfit } from '../model/types';

/**
 * Results, not exceptions. Storage fails in ordinary ways — private mode
 * throws on localStorage, persisted JSON goes malformed — and those are user
 * conditions, not programmer errors.
 */
export type StorageResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * The list comes back with a count of entries that could not be read, so the
 * saved screen can say some are missing rather than quietly showing fewer.
 */
export type OutfitList = { outfits: Outfit[]; unreadable: number };

/**
 * Interfaces below differ in their return types: OutfitStore methods return
 * StorageResult because a save failure is user-visible and the caller must act
 * on it. PreferenceStore returns bare promises, because a preference failure
 * degrades gracefully: onboarding shows again next visit.
 */
export interface OutfitStore {
  list(): Promise<StorageResult<OutfitList>>;
  /** An upsert: saving an id that is already stored replaces that entry. */
  save(outfit: Outfit): Promise<StorageResult<void>>;
  remove(id: string): Promise<StorageResult<void>>;
}

export interface PreferenceStore {
  hasOnboarded(): Promise<boolean>;
  setOnboarded(value: boolean): Promise<void>;
}
