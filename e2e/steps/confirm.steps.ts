import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { fakeCamera } from '../fakeCamera';
import { hexToRgb } from './entry.steps';

const { Given, When, Then } = createBdd();

// Written out rather than imported from src/features/confirm/copy.ts, for the
// same reason camera.steps.ts gives: a scenario has to fail if the words on
// screen change without anyone meaning them to.
const CLOSER = 'Closer to one of these?';

Given('my camera shows a plain garment', async ({ page }) => {
  await fakeCamera(page, 'garment');
});

Given('my camera shows a striped garment', async ({ page }) => {
  await fakeCamera(page, 'striped');
});

Given('my camera shows a busy scene', async ({ page }) => {
  await fakeCamera(page, 'busy');
});

When('I press {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
});

// Scoped to the panel's own group, so a name that also names something else
// on the screen, such as the reading itself, cannot be clicked by accident.
When('I choose the nearby color {string}', async ({ page }, name: string) => {
  await page
    .getByRole('group', { name: CLOSER })
    .getByRole('button', { name, exact: true })
    .click();
});

// A plain click on the slot screen's own button, unlike camera.steps.ts's "on
// the way to the camera", which gets there by `page.goto` and would skip past
// the heading this scenario checks on the way through.
When('I choose the slot {string}', async ({ page }, slot: string) => {
  await page.getByRole('button', { name: slot, exact: true }).click();
});

Then('I see {string} on the reading', async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});

Then('the base block is named {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('group', { name, exact: true })).toBeVisible();
});

// The busy scene's tappable patch is centred at frame pixel (48, 120), but
// the photo is drawn with object-fit: contain in this state, so a client
// coordinate is not a frame coordinate. This runs framePoint.ts's contain
// conversion in reverse against the element's own bounding box, rather than
// a fixed pixel offset that would go stale if the layout changed: scale is
// the smaller of the two axis ratios, and each axis is centred in whatever
// the other leaves spare.
When('I tap the garment on the photo', async ({ page }) => {
  const photo = page.getByRole('img', { name: 'Your photo' });
  const box = await photo.boundingBox();
  if (!box) throw new Error('the photo has not been laid out');
  const scale = Math.min(box.width / 320, box.height / 240);
  const x = 48 * scale + (box.width - 320 * scale) / 2;
  const y = 120 * scale + (box.height - 240 * scale) / 2;
  await photo.click({ position: { x, y } });
});

// Selection is drawn as an outline, on top of `aria-pressed`, so that a sighted
// user can see it too. StyleX emits no CSS under Vitest (ADR 0002), which is
// why this is checked here. The style is what shows whether an outline is
// drawn at all, and an unpressed button has to have none, or every button in
// the group would look selected.
Then('only the pressed button in {string} is outlined', async ({ page }, group: string) => {
  const buttons = page.getByRole('group', { name: group, exact: true }).getByRole('button');
  const pressed = buttons.and(page.locator('[aria-pressed="true"]'));
  const unpressed = buttons.and(page.locator('[aria-pressed="false"]'));
  await expect(pressed).toHaveCount(1);
  await expect(pressed).not.toHaveCSS('outline-style', 'none');
  await expect(pressed).toHaveCSS('outline-width', '3px');
  await expect(unpressed.first()).toBeVisible();
  for (const button of await unpressed.all()) {
    await expect(button).toHaveCSS('outline-style', 'none');
  }
});

// A phone turned on its side. The photo's canvas once set the row's height
// from its own aspect ratio, which pushed the buttons below the fold.
Given('my screen is {int} by {int}', async ({ page }, width: number, height: number) => {
  await page.setViewportSize({ width, height });
});

// The whole element inside the viewport, measured without scrolling to it.
// Playwright's own visibility checks would scroll it into view first.
Then('{string} is on screen without scrolling', async ({ page }, text: string) => {
  const target = page.getByText(text, { exact: true });
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error(`"${text}" has not been laid out`);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
});

// The browser's default accent is a saturated blue, and the panel exists to
// judge a color against the photo. The hex is written out, like the copy
// above, so the scenario fails if the token changes without anyone meaning it.
Then(
  "the {string} slider's accent color is {string}",
  async ({ page }, name: string, hex: string) => {
    await expect(page.getByRole('slider', { name, exact: true })).toHaveCSS(
      'accent-color',
      hexToRgb(hex),
    );
  },
);
