import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { fakeCamera } from '../fakeCamera';
import { hexToRgb } from './entry.steps';

const { Given, When, Then } = createBdd();

Given('my camera shows an outfit', async ({ page }) => {
  await fakeCamera(page, 'outfit');
});

When('I open the outfit check', async ({ page }) => {
  await page.goto('/check');
});

// Retried for the reason camera.steps.ts gives for "I take a photo".
When('I take a photo of the outfit', async ({ page }) => {
  await expect(async () => {
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await expect(page).toHaveURL(/\/check\/tap$/, { timeout: 500 });
  }).toPass();
});

// The outfit scene is 320x240 in four 60px bands. The photo is drawn with
// object-fit: contain, so this inverts framePoint.ts's contain conversion
// against the element's own box, as confirm.steps.ts does for the busy scene.
When('I tap piece {int} on the photo', async ({ page }, piece: number) => {
  const photo = page.getByRole('img', { name: 'Your photo' });
  const box = await photo.boundingBox();
  if (!box) throw new Error('the photo has not been laid out');
  const scale = Math.min(box.width / 320, box.height / 240);
  const x = 160 * scale + (box.width - 320 * scale) / 2;
  const y = (30 + 60 * (piece - 1)) * scale + (box.height - 240 * scale) / 2;
  const heading = page.getByRole('heading', { level: 1 });
  const before = await heading.textContent();
  await photo.click({ position: { x, y } });
  await expect(heading).not.toHaveText(before ?? '');
});

When('I set {string} to {string}', async ({ page }, row: string, color: string) => {
  await page.getByRole('button', { name: row, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: color, exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

// Checked here, not in a unit test: StyleX emits no CSS under Vitest (ADR 0002).
Then('the row {string} is filled with {string}', async ({ page }, row: string, hex: string) => {
  await expect(page.getByRole('button', { name: row, exact: true })).toHaveCSS(
    'background-color',
    hexToRgb(hex),
  );
});

// The result screen is #25's. The URL is the proof the list handed on.
Then('I am taken to the result', async ({ page }) => {
  await expect(page).toHaveURL(/\/check\/result$/);
});
