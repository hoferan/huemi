import type { CorrectionLog } from './port';

export const CORRECTIONS_KEY = 'huemi.corrections';

/**
 * Enough misses to see a pattern in, few enough that the log never competes
 * with saved outfits for the origin's storage quota.
 */
export const CORRECTIONS_LIMIT = 200;

/**
 * The port's correction log, one JSON array under one key, oldest first.
 *
 * It stays on the device (ADR 0013). Every failure ends in a resolved
 * promise, as the port asks: a lost correction costs a training signal and
 * nothing on screen. A stored value that is not an array is left as it is,
 * for the reason `localOutfits` refuses to write over one.
 */
export const localCorrections: CorrectionLog = {
  record(entry) {
    try {
      const text = localStorage.getItem(CORRECTIONS_KEY);
      const list: unknown = text === null ? [] : JSON.parse(text);
      if (Array.isArray(list)) {
        const kept: unknown[] = list;
        const next = [...kept, entry].slice(-CORRECTIONS_LIMIT);
        localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(next));
      }
    } catch {
      // Private mode, a full quota or malformed JSON: drop this one.
    }
    return Promise.resolve();
  },
};
