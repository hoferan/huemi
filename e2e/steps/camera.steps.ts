import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { fakeCamera } from '../fakeCamera';

const { Given, When, Then } = createBdd();

// Written out rather than imported from src/features/camera/copy.ts, so the
// scenario fails if the words on screen change without anyone meaning them to.
const DARK_MESSAGE = 'Too dark to read the color well. Move to a window or turn on a light.';

Given('my camera shows a bright scene', async ({ page }) => {
  await fakeCamera(page, 'bright');
});

Given('my camera shows a dark scene', async ({ page }) => {
  await fakeCamera(page, 'dark');
});

Given('my camera is blocked', async ({ page }) => {
  await fakeCamera(page, 'denied');
});

When('I open the camera for the top', async ({ page }) => {
  await page.goto('/camera?slot=top');
});

When('I choose the slot {string} on the way to the camera', async ({ page }, slot: string) => {
  await page.goto('/slot?next=camera');
  await page.getByRole('button', { name: slot, exact: true }).click();
});

Then('I see the button {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});

Then('I see the link {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
});

// `p:not([role])` because the live region repeats the message; this is the
// banner, the one a sighted user reads.
Then('I see the low-light warning', async ({ page }) => {
  await expect(page.locator('p:not([role])', { hasText: DARK_MESSAGE })).toBeVisible();
});

// Checked only after the time the warning would take to appear, so a bright
// scene wrongly read as dark cannot pass by being looked at too early.
Then('I do not see the low-light warning', async ({ page }) => {
  await page.waitForTimeout(1500);
  await expect(page.getByText(DARK_MESSAGE)).toHaveCount(0);
});

// The panel's heading sits under the screen's own, so it is a level 2.
Then('I am told {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
});

// A 1x1 PNG, written out so the scenario carries no binary fixture.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Retried, because a tap before the video has decoded a frame does nothing on
// purpose (`hasFrame`), and the fake camera's first frame is a moment behind
// the shutter appearing.
When('I take a photo', async ({ page }) => {
  await expect(async () => {
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await expect(page).toHaveURL(/\/confirm\?slot=top$/, { timeout: 500 });
  }).toPass();
});

When('I choose a photo of a garment', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'shirt.png',
    mimeType: 'image/png',
    buffer: Buffer.from(ONE_PIXEL_PNG, 'base64'),
  });
});

When('I choose a file that is not a photo', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a photo'),
  });
});

// The URL is the proof the capture was handed on; `confirm.feature` covers
// what the screen does with it.
Then('I am taken to confirm the top', async ({ page }) => {
  await expect(page).toHaveURL(/\/confirm\?slot=top$/);
});

Then('I see the text {string}', async ({ page }, text: string) => {
  await expect(page.locator('p:not([role])', { hasText: text })).toBeVisible();
});

// The invariant sweep scans `/camera` in its live state only. These two carry
// the same checks into the states it cannot reach by URL alone.
Then('the screen has no detectable accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

Then('every link and button is at least 44 by 44', async ({ page }) => {
  const controls = await page.getByRole('link').or(page.getByRole('button')).all();
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
