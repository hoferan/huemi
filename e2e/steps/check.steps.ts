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

Then('I am taken to the result', async ({ page }) => {
  await expect(page).toHaveURL(/\/check\/result$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'How it works together' }),
  ).toBeVisible();
});

Then('the check says {string}', async ({ page }, sentence: string) => {
  await expect(
    page
      .getByRole('list', { name: 'How it works together' })
      .getByRole('listitem')
      .filter({ hasText: sentence }),
  ).toBeVisible();
});

// Scoped to the open sheet, by name up to its position label, so the test does
// not hard-code where a color ranks.
When('I choose {string} in the sheet', async ({ page }, name: string) => {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: new RegExp(`^${name}(, \\d+ of \\d+)?$`) })
    .click();
});

Then('the block {string} is filled with {string}', async ({ page }, name: string, hex: string) => {
  const block = page.getByRole('group', { name, exact: true });
  await expect(block).toHaveCSS('background-color', hexToRgb(hex));
});
