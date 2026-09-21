import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDED_KEY, localPreferences } from './localPreferences';

describe('localPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports not onboarded when nothing is stored', async () => {
    await expect(localPreferences.hasOnboarded()).resolves.toBe(false);
  });

  it('round-trips the flag', async () => {
    await localPreferences.setOnboarded(true);
    await expect(localPreferences.hasOnboarded()).resolves.toBe(true);
  });

  it('treats any other stored value as not onboarded', async () => {
    localStorage.setItem(ONBOARDED_KEY, 'maybe');
    await expect(localPreferences.hasOnboarded()).resolves.toBe(false);
  });

  it('reports not onboarded when reading throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    await expect(localPreferences.hasOnboarded()).resolves.toBe(false);
  });

  it('swallows a write that throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    await expect(localPreferences.setOnboarded(true)).resolves.toBeUndefined();
  });
});
