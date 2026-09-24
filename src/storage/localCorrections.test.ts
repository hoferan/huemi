import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseHex } from '../model/hex';
import { CORRECTIONS_KEY, CORRECTIONS_LIMIT, localCorrections } from './localCorrections';

const navy = parseHex('#1f2a44');
const denim = parseHex('#4a6285');

function entry(at = '2026-09-24T10:00:00.000Z') {
  return { slot: 'bottom' as const, read: navy, corrected: denim, at };
}

function stored(): unknown {
  return JSON.parse(localStorage.getItem(CORRECTIONS_KEY) ?? 'null');
}

describe('localCorrections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a list with the first correction', async () => {
    await localCorrections.record(entry());
    expect(stored()).toEqual([entry()]);
  });

  it('appends later corrections after earlier ones', async () => {
    await localCorrections.record(entry('2026-09-24T10:00:00.000Z'));
    await localCorrections.record(entry('2026-09-24T11:00:00.000Z'));
    expect(stored()).toEqual([
      entry('2026-09-24T10:00:00.000Z'),
      entry('2026-09-24T11:00:00.000Z'),
    ]);
  });

  it('keeps only the most recent corrections', async () => {
    const full = Array.from({ length: CORRECTIONS_LIMIT }, (_, i) => entry(String(i)));
    localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(full));
    await localCorrections.record(entry('newest'));
    const list = stored() as { at: string }[];
    expect(list).toHaveLength(CORRECTIONS_LIMIT);
    expect(list[0]?.at).toBe('1');
    expect(list.at(-1)?.at).toBe('newest');
  });

  // Whatever is there may be something a person or a later version put
  // there. Losing one training signal is cheaper than destroying it.
  it.each([
    ['is not JSON', '{'],
    ['is not a list', '{"a":1}'],
  ])('leaves a stored value that %s untouched', async (_, raw) => {
    localStorage.setItem(CORRECTIONS_KEY, raw);
    await localCorrections.record(entry());
    expect(localStorage.getItem(CORRECTIONS_KEY)).toBe(raw);
  });

  it('resolves when reading throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    await expect(localCorrections.record(entry())).resolves.toBeUndefined();
  });

  it('resolves when writing throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    await expect(localCorrections.record(entry())).resolves.toBeUndefined();
  });
});
