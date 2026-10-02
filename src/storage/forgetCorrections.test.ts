import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetCorrections } from './forgetCorrections';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('forgetCorrections', () => {
  it('deletes the correction log an earlier version kept', () => {
    localStorage.setItem('huemi.corrections', '[]');
    forgetCorrections();
    expect(localStorage.getItem('huemi.corrections')).toBeNull();
  });

  it('leaves the rest of what huemi keeps alone', () => {
    localStorage.setItem('huemi.outfits', '[]');
    localStorage.setItem('huemi.onboarded', 'true');
    forgetCorrections();
    expect(localStorage.getItem('huemi.outfits')).toBe('[]');
    expect(localStorage.getItem('huemi.onboarded')).toBe('true');
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => forgetCorrections()).not.toThrow();
  });
});
