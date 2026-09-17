import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I open huemi', async ({ page }) => {
  await page.goto('/');
});

// Converts a hex color such as "#1f2a44" to the rgb(...) string a browser
// reports for a computed style, since toHaveCSS compares against whatever
// getComputedStyle actually returns.
function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

Then(
  'I see a color block named {string} with background color {string}',
  async ({ page }, name: string, hex: string) => {
    const block = page.getByRole('img', { name });
    await expect(block).toBeVisible();

    // This is the assertion Vitest cannot make: StyleX injects its
    // aggregated CSS from a Vite build hook that Vitest never calls, so
    // there is no StyleX CSS in jsdom at all. Only a real build proves the
    // color actually reached the browser, not just that a class name was
    // generated. If this fails with a transparent or unset background, the
    // StyleX plugin order in vite.config.ts is wrong, or the CSS entrypoint
    // import is missing — fix that rather than weakening this assertion.
    await expect(block).toHaveCSS('background-color', hexToRgb(hex));
  },
);
