import type { Page } from '@playwright/test';

/**
 * Marks onboarding as already seen, before any page script runs.
 *
 * `addInitScript` serialises its callback to run in the browser, so that
 * callback cannot close over anything from this module — the key is written
 * inside it as a literal rather than imported from
 * `src/storage/localPreferences.ts`. This is the one place in `e2e/` that
 * repeats the literal; every caller here goes through this function instead
 * of writing its own `addInitScript` call, so changing `ONBOARDED_KEY` only
 * means changing the string below.
 */
export async function seedOnboarded(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('huemi.onboarded', 'true');
  });
}
