import type { DevModeStore } from './port';

/** Exported so a test can seed storage without restating the string. */
export const DEV_MODE_KEY = 'huemi.devmode';

/**
 * The flag is `"on"` or absent. Anything else, and a storage that throws in
 * private mode, reads as off: a mode that cannot be confirmed should not be on.
 * A write that fails is dropped, and the provider keeps the mode for the
 * session in memory.
 */
export const localDevMode: DevModeStore = {
  isOn(): boolean {
    try {
      return localStorage.getItem(DEV_MODE_KEY) === 'on';
    } catch {
      return false;
    }
  },

  setOn(on: boolean): void {
    try {
      if (on) localStorage.setItem(DEV_MODE_KEY, 'on');
      else localStorage.removeItem(DEV_MODE_KEY);
    } catch {
      // Not worth failing a screen for; the mode still holds until the tab closes.
    }
  },
};
