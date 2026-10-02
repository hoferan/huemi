import { expect, type Locator, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then, When } = createBdd();

Given('I use a desktop window', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

When('I open the outfit pieces', async ({ page }) => {
  await page.goto('/check/pieces');
});

When('I open the piece {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click();
});

// Centered within a pixel, since a half-pixel remainder rounds either way.
async function expectCenteredColumn(page: Page, element: Locator, max: number) {
  await expect(element).toBeVisible();
  const box = (await element.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.width).toBeLessThanOrEqual(max);
  expect(Math.abs(box.x - (viewport.width - box.width) / 2)).toBeLessThanOrEqual(1);
}

Then('the screen is a centered column at most {int} wide', async ({ page }, max: number) => {
  await expectCenteredColumn(page, page.getByRole('main'), max);
});

Then('the sheet is a centered column at most {int} wide', async ({ page }, max: number) => {
  await expectCenteredColumn(page, page.getByRole('dialog'), max);
});

Then('the toast is a centered column at most {int} wide', async ({ page }, max: number) => {
  await expectCenteredColumn(page, page.locator('[data-toast]'), max);
});
