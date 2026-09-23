import { parseHex } from '../../model/hex';
import type { Outfit } from '../../model/types';
import { composeOutfit } from '../../session/select';
import type { Base } from '../../session/types';
import type { OutfitStore, StorageResult } from '../../storage/port';
import { buildOutfit } from './buildOutfit';

/**
 * Fixtures for tests of anything that reads saved outfits. Not imported by
 * application code, so nothing here reaches the bundle.
 */
export const NAVY_BOTTOM: Base = { slot: 'bottom', hex: parseHex('#1f2a44') };

/** The navy bottom's starting outfit, saved on 21 September. */
export function makeOutfit(overrides: Partial<Outfit> = {}): Outfit {
  const base = buildOutfit(
    NAVY_BOTTOM,
    composeOutfit(NAVY_BOTTOM, {}, () => 0),
    'navy',
    new Date('2026-09-21T10:00:00.000Z'),
  );
  return { ...base, ...overrides };
}

export type FakeOutfitStore = OutfitStore & {
  /** Flip a flag to make the next calls of that method fail. */
  fail: { list: boolean; save: boolean; remove: boolean };
  contents(): Outfit[];
};

const ok = <T>(value: T): Promise<StorageResult<T>> => Promise.resolve({ ok: true, value });
const failed = (reason: string): Promise<StorageResult<never>> =>
  Promise.resolve({ ok: false, reason });
const newestFirst = (a: Outfit, b: Outfit) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

/** An in-memory store with the port's semantics: upsert by id, newest first. */
export function fakeOutfitStore(initial: Outfit[] = [], unreadable = 0): FakeOutfitStore {
  let outfits = [...initial];
  const fail = { list: false, save: false, remove: false };
  return {
    fail,
    contents: () => [...outfits],
    list: () =>
      fail.list
        ? failed('list failed')
        : ok({ outfits: [...outfits].sort(newestFirst), unreadable }),
    save: (outfit) => {
      if (fail.save) return failed('save failed');
      // Upsert. Position does not matter here, because list sorts.
      outfits = [...outfits.filter((o) => o.id !== outfit.id), outfit];
      return ok(undefined);
    },
    remove: (id) => {
      if (fail.remove) return failed('remove failed');
      outfits = outfits.filter((o) => o.id !== id);
      return ok(undefined);
    },
  };
}
