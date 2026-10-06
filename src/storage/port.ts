import type { FieldCapture, FieldGarment } from '../model/field';
import type { Pixels } from '../model/frame';
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

/**
 * Synchronous, unlike the other ports: it is read during the first render so a
 * deep link to /dev never flashes the not-found screen while a promise settles.
 */
export interface DevModeStore {
  isOn(): boolean;
  setOn(on: boolean): void;
}

/**
 * The developer mode's field recorder: garments with known colors, the
 * metadata of each recorded capture, and the capture's raw frame. Results
 * rather than exceptions, like OutfitStore, since a full disk or private mode
 * is an ordinary failure the screen reports.
 */
export interface FieldStore {
  /** Newest first. */
  listGarments(): Promise<StorageResult<FieldGarment[]>>;
  /** An upsert. */
  saveGarment(garment: FieldGarment): Promise<StorageResult<void>>;
  /** Also removes the garment's captures and their frames, so none are orphaned. */
  deleteGarment(id: string): Promise<StorageResult<void>>;
  /** Newest first, metadata only: a frame is far larger, so readPixels fetches it. */
  listCaptures(): Promise<StorageResult<FieldCapture[]>>;
  saveCapture(capture: FieldCapture, pixels: Pixels): Promise<StorageResult<void>>;
  /** Fails for an id with no frame. */
  readPixels(id: string): Promise<StorageResult<Pixels>>;
  /** Removes the metadata and the frame. Fails for an unknown id. */
  deleteCapture(id: string): Promise<StorageResult<void>>;
  /** Sets the capture's garment. Fails for an unknown capture id. */
  linkCapture(id: string, garmentId: string): Promise<StorageResult<void>>;
  /**
   * The random id this device's exports carry, made the first time it is
   * asked for and the same ever after.
   */
  setId(): Promise<StorageResult<string>>;
}
