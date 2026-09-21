import type { PreferenceStore } from './port';

/**
 * Exported so a test can seed storage without restating the string.
 *
 * `e2e/seedOnboarded.ts` repeats this value as a literal — `addInitScript`
 * serialises its callback to run in the browser, so that callback cannot
 * close over this export. Renaming this key means updating that file too.
 */
export const ONBOARDED_KEY = 'huemi.onboarded';

/**
 * The port's first implementation.
 *
 * `PreferenceStore` returns bare promises rather than results because a
 * preference failure degrades instead of blocking: onboarding shows again
 * next visit and nothing else changes. That is why every path here ends in a
 * value rather than an error. `localStorage` throws outright in private mode
 * on some browsers, and a stored value can be anything if a person has edited
 * it by hand, so both are treated as "not onboarded" rather than trusted.
 *
 * The methods are async because the port is, and the port is because M6's
 * offline work may put this behind something that genuinely is. Today every
 * call resolves in a microtask.
 */
export const localPreferences: PreferenceStore = {
  hasOnboarded(): Promise<boolean> {
    try {
      return Promise.resolve(localStorage.getItem(ONBOARDED_KEY) === 'true');
    } catch {
      return Promise.resolve(false);
    }
  },

  setOnboarded(value: boolean): Promise<void> {
    try {
      localStorage.setItem(ONBOARDED_KEY, String(value));
    } catch {
      // A preference that will not persist is not worth failing a screen for.
    }
    return Promise.resolve();
  },
};
