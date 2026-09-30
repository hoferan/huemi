import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

Given('the app is ready to work offline', async ({ page }) => {
  // `ready` settles once a worker is active, but the page that registered it is
  // not controlled until its next load, so reload once and wait for control.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
});

When('I go offline', async ({ page }) => {
  await page.context().setOffline(true);
});

When('I open {string} while offline', async ({ page }, path: string) => {
  await page.goto(path);
});

// Chromium fires this when it would offer to install. Playwright cannot make it
// do so, so the page is handed the same event: cancelable, with a prompt to show
// and a choice that settles when the person answers.
When('the browser offers to install the app', async ({ page }) => {
  await page.evaluate(() => {
    const offer = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(offer, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(offer);
  });
});

When('the app is installed', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
});

Then('I do not see the button {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
});
