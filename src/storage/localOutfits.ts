import { parseHex, type Hex } from '../model/hex';
import { SLOTS, type Outfit, type Slot } from '../model/types';
import type { OutfitList, OutfitStore, StorageResult } from './port';

/**
 * Exported so tests can seed storage without restating the string.
 *
 * `e2e/seedOutfit.ts` repeats this value as a literal, for the reason
 * `ONBOARDED_KEY` is repeated in `e2e/seedOnboarded.ts`: `addInitScript`
 * serialises its callback, so it cannot close over this export.
 */
export const OUTFITS_KEY = 'huemi.outfits';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSlot(value: unknown): value is Slot {
  return SLOTS.some((slot) => slot === value);
}

function readHex(value: unknown): Hex | null {
  if (typeof value !== 'string') return null;
  try {
    return parseHex(value);
  } catch {
    return null;
  }
}

/**
 * One stored entry, or null if it is not an outfit this version can show.
 *
 * Hexes go through `parseHex` rather than `isHex`, because storage is one of
 * the untrusted sources `hex.ts` names: a hand-edited `#1F2A44` is still navy.
 * A `createdAt` that does not parse is rejected here, since the list sorts on
 * it and the card prints it.
 */
export function parseOutfit(value: unknown): Outfit | null {
  if (!isRecord(value)) return null;
  const { version, id, name, note, createdAt, baseSlot, pieces } = value;
  if (version !== 1) return null;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) return null;
  if (note !== undefined && typeof note !== 'string') return null;
  if (!isSlot(baseSlot) || !isRecord(pieces)) return null;

  const parsed: Partial<Record<Slot, Hex>> = {};
  for (const [slot, raw] of Object.entries(pieces)) {
    const hex = readHex(raw);
    if (!isSlot(slot) || hex === null) return null;
    parsed[slot] = hex;
  }
  if (parsed[baseSlot] === undefined) return null;

  const outfit: Outfit = { version: 1, id, name, createdAt, baseSlot, pieces: parsed };
  if (note !== undefined) outfit.note = note;
  return outfit;
}

function readRaw(): StorageResult<unknown[]> {
  let text: string | null;
  try {
    text = localStorage.getItem(OUTFITS_KEY);
  } catch {
    return { ok: false, reason: 'Storage could not be read.' };
  }
  if (text === null) return { ok: true, value: [] };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Saved outfits are not valid JSON.' };
  }
  if (!Array.isArray(value)) return { ok: false, reason: 'Saved outfits are not a list.' };
  return { ok: true, value };
}

function writeRaw(entries: unknown[]): StorageResult<void> {
  try {
    localStorage.setItem(OUTFITS_KEY, JSON.stringify(entries));
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, reason: 'Storage could not be written.' };
  }
}

function rawId(entry: unknown): unknown {
  return isRecord(entry) ? entry.id : undefined;
}

/**
 * The port's outfit implementation, one JSON array under one key.
 *
 * Writes go through the raw array, not the parsed list, so an entry this
 * version cannot read survives a save or a delete untouched. A stored value
 * that is not an array at all fails every call, writes included, because
 * writing a fresh array over it would destroy whatever it was.
 *
 * Async because the port is; every call resolves in a microtask, as in
 * `localPreferences`.
 */
export const localOutfits: OutfitStore = {
  list(): Promise<StorageResult<OutfitList>> {
    const raw = readRaw();
    if (!raw.ok) return Promise.resolve(raw);
    const outfits: Outfit[] = [];
    let unreadable = 0;
    for (const entry of raw.value) {
      const outfit = parseOutfit(entry);
      if (outfit) outfits.push(outfit);
      else unreadable += 1;
    }
    outfits.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return Promise.resolve({ ok: true, value: { outfits, unreadable } });
  },

  save(outfit: Outfit): Promise<StorageResult<void>> {
    const raw = readRaw();
    if (!raw.ok) return Promise.resolve(raw);
    const at = raw.value.findIndex((entry) => rawId(entry) === outfit.id);
    const next = [...raw.value];
    if (at === -1) next.push(outfit);
    else next[at] = outfit;
    return Promise.resolve(writeRaw(next));
  },

  remove(id: string): Promise<StorageResult<void>> {
    const raw = readRaw();
    if (!raw.ok) return Promise.resolve(raw);
    return Promise.resolve(writeRaw(raw.value.filter((entry) => rawId(entry) !== id)));
  },
};
