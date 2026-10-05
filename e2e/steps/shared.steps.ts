import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

When('I open the shared link {string}', async ({ page }, link: string) => {
  await page.goto(link);
});

// By its heading, which is what a visitor sees, whatever route they took.
Then('I am on the start screen', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Start with a garment' })).toBeVisible();
});
