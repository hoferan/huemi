import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { hexToRgb } from './entry.steps';

const { Given, Then, When } = createBdd();

Given('I open the picker for the top', async ({ page }) => {
  await page.goto('/color?slot=top');
});

Given('I open the garment choice', async ({ page }) => {
  await page.goto('/slot');
});

// The choices are the buttons in the main area. Filling the screen means the
// last thing on it, a choice or the link under them, ends near the bottom of
// the viewport, neither half way down nor below it, and that no choice was
// squeezed to make that happen.
Then('the choices fill the screen, each at least {int} tall', async ({ page }, min: number) => {
  const main = page.getByRole('main');
  const choices = await main.getByRole('button').all();
  expect(choices.length).toBeGreaterThan(0);
  for (const choice of choices) {
    expect((await choice.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(min);
  }
  const viewport = page.viewportSize()!;
  const bottom = await main.evaluate((el) =>
    Math.max(...[...el.querySelectorAll('button, a')].map((c) => c.getBoundingClientRect().bottom)),
  );
  expect(bottom).toBeGreaterThan(viewport.height - 48);
  // Choices that grew past the screen push the last of them, or the link
  // under them, out of sight.
  expect(bottom).toBeLessThanOrEqual(viewport.height);
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

// The name is the only channel that tells Forest from Olive for someone who
// cannot see the difference, so it has to be on the swatch and not only in
// the accessible name. `toBeVisible` would pass a visually hidden name, whose
// 1px box is not empty, so this reads the clip and the width instead.
Then('every swatch shows its name', async ({ page }) => {
  const swatches = page.getByRole('main').getByRole('button');
  await expect(swatches).toHaveCount(21);
  for (const swatch of await swatches.all()) {
    const name = swatch.locator('span');
    await expect(name).not.toHaveText('');
    await expect(name).toHaveCSS('clip-path', 'none');
    expect((await name.boundingBox())?.width ?? 0).toBeGreaterThan(8);
  }
});
