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
  // The screen seeds from an effect, so waiting for the heading is not enough:
  // the blocks arrive a tick later and a step that clicked Shuffle before then
  // would shuffle an outfit that was not there yet.
  await expect(page.getByRole('group', { name: /^Shoes:/ })).toBeVisible();
});

// Fake timers, then a pause. Everything the shuffle crossfade can be measured
// through is transient by construction: `shuffling` clears itself after
// `tokens.shuffle`, and after that the blocks read `colorFade` again. Polling
// for a computed style inside that window is a coin toss, and under reduced
// motion both durations are 0s, so a scenario that lost the race would pass
// while measuring the wrong thing. Holding the clock removes the window's end
// rather than betting on being quick.
//
// Installed after the page has loaded, so no timer the app needs during boot
// is caught by the pause.
When('time stops', async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(Date.now());
});

When('I shuffle', async ({ page }) => {
  await page.getByRole('button', { name: /^Shuffle/ }).click();
});

Then('the {string} block carries a suggestion', async ({ page }, slot: string) => {
  // Named, not just present: `blockLabel` writes "Shoes: Pale blue", so a block
  // that rendered without a colour could not produce this name.
  await expect(page.getByRole('group', { name: new RegExp(`^${slot}: \\S`) })).toBeVisible();
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

// Kept for the two steps below, which measure whatever was focused rather than
// a control they name themselves. A step that re-queried by hand would keep
// passing after the scenario was pointed at a different control.
let focused = '';

When('I focus the {string} control', async ({ page }, name: string) => {
  focused = name;
  await page.getByRole('button', { name }).focus();
});

Then("its outline colour matches the block's foreground", async ({ page }) => {
  const control = page.getByRole('button', { name: focused });
  // currentColor is what readableForeground chose for this block, which is the
  // whole reason the ring is drawn from it: the browser default is picked
  // without knowing what is underneath.
  const [outline, color] = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.outlineColor, style.color];
  });
  expect(outline).toBe(color);
});

// The colour alone proves nothing about focus. `outlineColor` is set
// unconditionally, so it resolves against `color` on every control on the
// screen, focused or not, and the assertion above held before anything was
// focused. `outlineStyle` is the half that is conditioned on
// `:focus-visible`, so it is the half that says the ring is being drawn.
Then('the focus ring is drawn on it', async ({ page }) => {
  const control = page.getByRole('button', { name: focused });
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS('outline-style', 'solid');
  await expect(control).toHaveCSS('outline-width', '3px');
});

Then(
  'the {string} block has a transition duration of {string}',
  async ({ page }, slot: string, duration: string) => {
    const block = page.getByRole('group', { name: new RegExp(`^${slot}:`) });
    await expect(block).toHaveCSS('transition-duration', duration);
  },
);
