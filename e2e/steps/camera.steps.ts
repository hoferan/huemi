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
