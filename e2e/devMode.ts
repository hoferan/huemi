import type { Page } from '@playwright/test';

/** The passphrase the end-to-end build is given the hash of. */
export const E2E_PASSPHRASE = 'e2e passphrase';

/**
 * The hash of `e2e passphrase`, as `hashPassphrase` computes it: the value
 * `VITE_DEV_MODE_HASH` takes in the build the browser suite runs against.
 * `playwright.config.ts` and the e2e job in `.github/workflows/ci.yml` repeat
 * it, since neither can import this file, so changing it means changing all
 * three. The passphrase scenarios fail if they drift apart.
 * `npm run devmode:hash` prints the hash of any passphrase.
 */
export const E2E_DEV_MODE_HASH = 'ffaaca00a0ad6dba9afc41fefad93144077262305dce6d54c73bdcc24e5c5870';

/**
 * Turns developer mode on before any page script runs.
 *
 * As with `seedOnboarded`, the callback runs in the browser and cannot close
 * over this module, so the storage key is repeated as a literal; it is
 * `DEV_MODE_KEY` in `src/storage/localDevMode.ts`.
 */
export async function seedDevMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('huemi.devmode', 'on');
  });
}
