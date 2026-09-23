import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeOutfitId } from './makeOutfitId';

describe('makeOutfitId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses crypto.randomUUID when it is available', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
    expect(makeOutfitId()).toBe('11111111-1111-1111-1111-111111111111');
  });

  // A non-secure http origin has no `crypto.randomUUID`, and saving must still
  // work there. The method lives on `Crypto.prototype`, not on the instance,
  // so removing it means deleting it there.
  it('falls back to a random string when randomUUID is missing', () => {
    const proto = Object.getPrototypeOf(crypto) as {
      randomUUID?: Crypto['randomUUID'] | undefined;
    };
    const original = proto.randomUUID;
    delete proto.randomUUID;
    try {
      const id = makeOutfitId();
      expect(id).toMatch(/^[0-9a-z]+$/);
      expect(id.length).toBeGreaterThan(0);
    } finally {
      proto.randomUUID = original;
    }
  });
});
