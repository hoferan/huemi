import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { seedOutfit } from '../seedOutfit';

const { Given, When, Then } = createBdd();

Given('I have a saved outfit', async ({ page }) => {
  await seedOutfit(page);
});

When('I follow the link {string}', async ({ page }, name: string) => {
  await page.getByRole('link', { name, exact: true }).click();
});

When('I save the outfit', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Save outfit' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

When('I open the saved outfits', async ({ page }) => {
  await page.goto('/saved');
  await expect(page.getByRole('heading', { level: 1, name: 'Saved outfits' })).toBeVisible();
});

When('I reload the page', async ({ page }) => {
  await page.reload();
});

When('I open the saved outfit {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('group', { name: /^Shoes:/ })).toBeVisible();
});

When('I delete the saved outfit {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
});

When('I press Undo', async ({ page }) => {
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
});

// Focus inside the toast holds it, which is the point, so a scenario that
// wants it to expire has to take focus elsewhere first.
When('I move focus away from the toast', async ({ page }) => {
  await page.getByRole('heading', { level: 1 }).focus();
});

When('the toast goes away', async ({ page }) => {
  await expect(page.locator('[data-toast]')).toHaveCount(0, { timeout: 10_000 });
});

Then('I see a saved outfit named {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});

Then('the Undo control has focus', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeFocused();
});

Then('the save control is pressed', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Save outfit' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

Then('I am told nothing is saved', async ({ page }) => {
  await expect(page.getByText('Nothing saved yet.', { exact: false })).toBeVisible();
});

// `[data-toast]` rather than the text: the live region repeats the message,
// so a text locator matches two elements.
Then('the toast has an animation duration of {string}', async ({ page }, duration: string) => {
  await expect(page.locator('[data-toast]')).toHaveCSS('animation-duration', duration);
});
