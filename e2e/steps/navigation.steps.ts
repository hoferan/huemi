import { createBdd } from 'playwright-bdd';

const { Given, When } = createBdd();

// Straight onto a screen with no history behind it, as an installed app does
// when it opens on a link.
Given('I open {string}', async ({ page }, path: string) => {
  await page.goto(path);
});

When("I use the phone's back button", async ({ page }) => {
  await page.goBack();
});
