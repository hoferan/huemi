import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseHex } from '../model/hex';
import type { Outfit } from '../model/types';
import { OUTFITS_KEY, localOutfits, parseOutfit } from './localOutfits';

const navy = parseHex('#1f2a44');
const cream = parseHex('#e9dfc9');

function outfit(overrides: Partial<Outfit> = {}): Outfit {
  return {
    version: 1,
    id: 'a',
    name: 'Navy bottom',
    createdAt: '2026-09-21T10:00:00.000Z',
    baseSlot: 'bottom',
    pieces: { bottom: navy, top: cream },
    ...overrides,
  };
}

function stored(): unknown {
  return JSON.parse(localStorage.getItem(OUTFITS_KEY) ?? 'null');
}

describe('parseOutfit', () => {
  it('accepts an outfit it wrote', () => {
    expect(parseOutfit(outfit())).toEqual(outfit());
  });

  it('keeps a note', () => {
    expect(parseOutfit(outfit({ note: 'work' }))?.note).toBe('work');
  });

  // A person can edit localStorage by hand. parseHex is the one place a hex
  // is validated, and it normalises what it accepts.
  it('normalises a hand-edited hex', () => {
    const edited = { ...outfit(), pieces: { bottom: '#1F2A44', top: '#abc' } };
    expect(parseOutfit(edited)?.pieces).toEqual({ bottom: navy, top: parseHex('#aabbcc') });
  });

  it.each([
    ['not an object', 'nope'],
    ['null', null],
    ['an array', []],
    ['another version', { ...outfit(), version: 2 }],
    ['no id', { ...outfit(), id: 3 }],
    ['no name', { ...outfit(), name: undefined }],
    ['a note that is not text', { ...outfit(), note: 4 }],
    ['a createdAt that is not a date', { ...outfit(), createdAt: 'yesterday' }],
    ['an unknown base slot', { ...outfit(), baseSlot: 'hat' }],
    ['pieces that are not an object', { ...outfit(), pieces: 'navy' }],
    ['a piece in an unknown slot', { ...outfit(), pieces: { bottom: '#1f2a44', hat: '#1f2a44' } }],
    ['a piece that is not a hex', { ...outfit(), pieces: { bottom: 'navy' } }],
    ['a piece that is not text', { ...outfit(), pieces: { bottom: 7 } }],
    ['no piece in the base slot', { ...outfit(), pieces: { top: '#e9dfc9' } }],
  ])('rejects %s', (_, value) => {
    expect(parseOutfit(value)).toBeNull();
  });
});

describe('localOutfits', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists nothing when nothing is stored', async () => {
    await expect(localOutfits.list()).resolves.toEqual({
      ok: true,
      value: { outfits: [], unreadable: 0 },
    });
  });

  it('round-trips a saved outfit', async () => {
    await expect(localOutfits.save(outfit())).resolves.toEqual({ ok: true, value: undefined });
    await expect(localOutfits.list()).resolves.toEqual({
      ok: true,
      value: { outfits: [outfit()], unreadable: 0 },
    });
  });

  it('lists newest first', async () => {
    await localOutfits.save(outfit({ id: 'old', createdAt: '2026-09-01T10:00:00.000Z' }));
    await localOutfits.save(outfit({ id: 'new', createdAt: '2026-09-22T10:00:00.000Z' }));
    const result = await localOutfits.list();
    expect(result.ok && result.value.outfits.map((o) => o.id)).toEqual(['new', 'old']);
  });

  it('replaces an outfit saved again under the same id', async () => {
    await localOutfits.save(outfit());
    await localOutfits.save(outfit({ name: 'Renamed' }));
    expect(stored()).toEqual([outfit({ name: 'Renamed' })]);
  });

  it('removes by id', async () => {
    await localOutfits.save(outfit({ id: 'a' }));
    await localOutfits.save(outfit({ id: 'b' }));
    await localOutfits.remove('a');
    expect(stored()).toEqual([outfit({ id: 'b' })]);
  });

  it('counts entries it cannot read and leaves them out', async () => {
    localStorage.setItem(OUTFITS_KEY, JSON.stringify([outfit(), { junk: true }, 'x']));
    await expect(localOutfits.list()).resolves.toEqual({
      ok: true,
      value: { outfits: [outfit()], unreadable: 2 },
    });
  });

  // An entry this version cannot read may be one a later version wrote.
  // Rewriting the array without it would delete it without anyone asking.
  it('keeps entries it cannot read when it writes', async () => {
    localStorage.setItem(OUTFITS_KEY, JSON.stringify([{ version: 2, id: 'future' }, 'x']));
    await localOutfits.save(outfit());
    expect(stored()).toEqual([{ version: 2, id: 'future' }, 'x', outfit()]);
    await localOutfits.remove('a');
    expect(stored()).toEqual([{ version: 2, id: 'future' }, 'x']);
  });

  it.each([
    ['is not JSON', '{'],
    ['is not a list', '{"a":1}'],
  ])('fails to list when the stored value %s', async (_, raw) => {
    localStorage.setItem(OUTFITS_KEY, raw);
    const result = await localOutfits.list();
    expect(result.ok).toBe(false);
  });

  it('refuses to write over a stored value it cannot read', async () => {
    localStorage.setItem(OUTFITS_KEY, '{');
    expect((await localOutfits.save(outfit())).ok).toBe(false);
    expect((await localOutfits.remove('a')).ok).toBe(false);
    expect(localStorage.getItem(OUTFITS_KEY)).toBe('{');
  });

  it('fails when reading throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect((await localOutfits.list()).ok).toBe(false);
    expect((await localOutfits.save(outfit())).ok).toBe(false);
  });

  it('fails when writing throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect((await localOutfits.save(outfit())).ok).toBe(false);
  });
});
