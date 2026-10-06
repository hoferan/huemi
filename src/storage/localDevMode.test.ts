import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEV_MODE_KEY, localDevMode } from './localDevMode';

describe('localDevMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads "on" as on', () => {
    localStorage.setItem(DEV_MODE_KEY, 'on');
    expect(localDevMode.isOn()).toBe(true);
  });

  it('reads nothing stored as off', () => {
    expect(localDevMode.isOn()).toBe(false);
  });

  it('reads junk or a throwing storage as off', () => {
    localStorage.setItem(DEV_MODE_KEY, 'yes');
    expect(localDevMode.isOn()).toBe(false);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(localDevMode.isOn()).toBe(false);
  });

  it('writes "on" when turned on', () => {
    localDevMode.setOn(true);
    expect(localStorage.getItem(DEV_MODE_KEY)).toBe('on');
  });

  it('setOn(false) removes the key', () => {
    localStorage.setItem(DEV_MODE_KEY, 'on');
    localDevMode.setOn(false);
    expect(localStorage.getItem(DEV_MODE_KEY)).toBeNull();
  });

  it('setOn swallows a throwing storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => localDevMode.setOn(true)).not.toThrow();
    expect(() => localDevMode.setOn(false)).not.toThrow();
  });
});
