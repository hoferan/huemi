import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { hexToRgb } from './entry.steps';

const { Given, When, Then } = createBdd();

const MUSTARD_TOP = '/suggest?slot=top&hex=%23c39a3a';

Given('I prefer reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

When('I open the suggestions for a mustard top', async ({ page }) => {
  await page.goto(MUSTARD_TOP);
});

Then('the block {string} has background {string}', async ({ page }, slot: string, hex: string) => {
  // The runtime-hex assertion #15 owed back: this colour is not a token, it is
  // a value that travelled from the URL through the engine into a StyleX
  // dynamic style. A transparent result means the StyleX plugin order in
  // vite.config.ts is wrong, or the CSS entrypoint import is missing.
  await expect(page.getByRole('group', { name: new RegExp(`^${slot}:`) })).toHaveCSS(
    'background-color',
    hexToRgb(hex),
  );
});

Then('every control on the {string} block is at least 44 by 44', async ({ page }, slot: string) => {
  const block = page.getByRole('group', { name: new RegExp(`^${slot}:`) });
  const controls = block.getByRole('button');
  const count = await controls.count();
  // Three: the colour field, Keep and Next. A count that drops silently
  // would make this scenario pass while checking nothing.
  expect(count).toBe(3);
  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

When('I focus the {string} control', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).focus();
});

Then("its outline colour matches the block's foreground", async ({ page }) => {
  const control = page.getByRole('button', { name: 'Next suggestion for Shoes' });
  // currentColor is what readableForeground chose for this block, which is the
  // whole reason the ring is drawn from it: the browser default is picked
  // without knowing what is underneath.
  const [outline, color] = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.outlineColor, style.color];
  });
  expect(outline).toBe(color);
});

Then(
  'the {string} block has a transition duration of {string}',
  async ({ page }, slot: string, duration: string) => {
    const block = page.getByRole('group', { name: new RegExp(`^${slot}:`) });
    await expect(block).toHaveCSS('transition-duration', duration);
  },
);
