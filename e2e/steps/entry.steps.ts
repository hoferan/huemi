import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { seedOnboarded } from '../seedOnboarded';

const { Given, Then } = createBdd();

Given('I open huemi', async ({ page }) => {
  await page.goto('/');
});

Given('I have seen the welcome screen', async ({ page }) => {
  // seedOnboarded runs before any page script, via addInitScript, so the
  // gate's first read already sees the flag. Setting it after goto would
  // race the redirect.
  await seedOnboarded(page);
});

// Converts a hex color such as "#1f2a44" to the rgb(...) string a browser
// reports for a computed style, since toHaveCSS compares against whatever
// getComputedStyle actually returns.
export function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

Then('I see the heading {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
});

Then(
  'the button {string} has background {string}',
  async ({ page }, label: string, hex: string) => {
    // This is the assertion Vitest cannot make: StyleX injects its
    // aggregated CSS from a Vite build hook that Vitest never calls, so
    // there is no StyleX CSS in jsdom at all. Only a real build proves the
    // color actually reached the browser, not just that a class name was
    // generated. If this fails with a transparent or unset background, the
    // StyleX plugin order in vite.config.ts is wrong, or the CSS entrypoint
    // import is missing — fix that rather than weakening this assertion.
    //
    // This is a weaker proof than the spike screen's was: it checks the
    // "Take a photo" button's background against `tokens.primary`, a
    // compile-time token, rather than against a literal runtime hex chosen
    // independently of the source. #15 owes the runtime-hex assertion back
    // once the palette swatches land.
    await expect(page.getByRole('button', { name: label })).toHaveCSS(
      'background-color',
      hexToRgb(hex),
    );
  },
);
