import type { Page } from '@playwright/test';

/**
 * Puts one saved outfit in storage before any page script runs: the navy
 * bottom's starting outfit, so opening it finds every piece in its list.
 *
 * The key and the outfit are literals for the reason `seedOnboarded.ts`
 * gives: `addInitScript` serialises its callback. The key is `OUTFITS_KEY` in
 * `src/storage/localOutfits.ts`.
 *
 * It runs on every navigation, reloads included, so it writes only when the
 * key is absent. Otherwise a reload would put back an outfit the scenario had
 * just deleted.
 */
export async function seedOutfit(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('huemi.outfits') !== null) return;
    window.localStorage.setItem(
      'huemi.outfits',
      JSON.stringify([
        {
          version: 1,
          id: 'seeded',
          name: 'Navy bottom',
          createdAt: '2026-09-21T10:00:00.000Z',
          baseSlot: 'bottom',
          pieces: {
            bottom: '#1f2a44',
            outerwear: '#1b1b1b',
            top: '#3d3d3f',
            shoes: '#2f4a3a',
            accessory: '#6b2733',
          },
        },
      ]),
    );
  });
}
