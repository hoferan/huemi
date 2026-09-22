import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { hexToRgb } from './entry.steps';

const { Given, Then, When } = createBdd();

Given('I open the picker for the top', async ({ page }) => {
  await page.goto('/color?slot=top');
});

// A tap commits and navigates. This is the only route into the suggestions
// screen a user takes, and the step exists so a scenario can take it rather
// than arriving by `page.goto` on a session that has never held anything.
When('I choose the swatch {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click();
});

Then('the swatch {string} has background {string}', async ({ page }, name: string, hex: string) => {
  // This is the assertion ADR 0002 lost when the spike screen was retired in
  // #14. A token's value is compiled in; these hexes come from PALETTE and
  // reach the browser through a StyleX dynamic style, which is the property
  // every color block in M4 to M6 depends on.
  await expect(page.getByRole('button', { name })).toHaveCSS('background-color', hexToRgb(hex));
});
