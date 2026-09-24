import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { fakeCamera } from '../fakeCamera';

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
