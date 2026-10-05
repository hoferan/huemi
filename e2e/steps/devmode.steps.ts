import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { E2E_PASSPHRASE, seedDevMode } from '../devMode';
import type { RecordedShare } from '../fakeShare';

const { Given, When, Then } = createBdd();

Given('developer mode is on', async ({ page }) => {
  await seedDevMode(page);
});

// The wordmark on the start screen is a plain paragraph, not a link, so it is
// found by its text inside the header.
When('I tap the wordmark {int} times', async ({ page }, count: number) => {
  const wordmark = page.getByText('huemi', { exact: true }).first();
  for (let tap = 0; tap < count; tap += 1) await wordmark.click();
});

async function enterPassphrase(page: import('@playwright/test').Page, passphrase: string) {
  const sheet = page.getByRole('dialog', { name: 'Developer mode' });
  await sheet.getByLabel('Passphrase').fill(passphrase);
  await sheet.getByRole('button', { name: 'Unlock', exact: true }).click();
}

When('I enter the developer passphrase', async ({ page }) => {
  await enterPassphrase(page, E2E_PASSPHRASE);
});

When('I enter the passphrase {string}', async ({ page }, passphrase: string) => {
  await enterPassphrase(page, passphrase);
});

Then('I see {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
});

Then('I see the developer chip', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Developer mode', exact: true })).toBeVisible();
});

Then('I do not see the developer chip', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Developer mode', exact: true })).toHaveCount(0);
});

// The build writes these into index.html (vite.config.ts) and the menu reads
// them from there, so `unknown` here means the two disagree on a meta name.
Then('the menu names the commit and date of the build', async ({ page }) => {
  const facts = page.locator('section', { has: page.getByRole('heading', { name: 'Build' }) });
  await expect(facts.locator('dd').nth(0)).toHaveText(/^[0-9a-f]{7,}$/);
  await expect(facts.locator('dd').nth(1)).toHaveText(/^\d{4}-\d{2}-\d{2}T/);
});

When('I open {string} and the offline worker is ready', async ({ page }, path: string) => {
  await page.goto(path);
  // `ready` settles once a worker is active. The menu reads the cache names
  // when it mounts, so it is opened again after that.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.goto(path);
});

Then('the Offline section lists a cache starting {string}', async ({ page }, prefix: string) => {
  const section = page.locator('section', { has: page.getByRole('heading', { name: 'Offline' }) });
  await expect(
    section.getByRole('listitem').filter({ hasText: new RegExp(`^${prefix}`) }),
  ).not.toHaveCount(0);
});

// The back bar's middle cell is the home link. Within 2 px of the bar's own
// centre, in both Playwright projects.
Then('the home link is centred in the bar', async ({ page }) => {
  const home = await page.getByRole('link', { name: 'huemi, home' }).boundingBox();
  const bar = await page
    .getByRole('link', { name: 'huemi, home' })
    .locator('xpath=..')
    .boundingBox();
  expect(home).not.toBeNull();
  expect(bar).not.toBeNull();
  const offset = home!.x + home!.width / 2 - (bar!.x + bar!.width / 2);
  expect(Math.abs(offset), `home link is ${offset}px off centre`).toBeLessThanOrEqual(2);
});

// The share steps read the recorded shares; the first is kept here because the
// reload that turns the mode on starts the fake share sheet over.
const firstShares = new WeakMap<object, unknown>();

When('developer mode is turned on and I share the same outfit again', async ({ page }) => {
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares.length),
      {
        timeout: 15_000,
      },
    )
    .toBe(1);
  firstShares.set(
    page,
    await page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares[0]),
  );
  await page.evaluate(() => window.localStorage.setItem('huemi.devmode', 'on'));
  await page.reload();
  await expect(page.getByRole('group', { name: /^Shoes:/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Developer mode', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Share outfit' }).click();
});

Then('the two shares are identical', async ({ page }) => {
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares.length),
      {
        timeout: 15_000,
      },
    )
    .toBe(1);
  const second = await page.evaluate(
    () => (window as unknown as { __shares: unknown[] }).__shares[0],
  );
  // Two shares with no picture would compare equal without proving anything.
  const first = firstShares.get(page) as RecordedShare | undefined;
  expect(first?.files).toHaveLength(1);
  expect(second).toEqual(first);
});
