import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { expect, type Download, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import type { FieldExport } from '../../src/model/field';
import { decodeFieldExport } from '../../src/model/fieldExport';
import { fakeCamera } from '../fakeCamera';

const { Given, When, Then } = createBdd();

// The export step starts the download and the checks after it read it, so
// both are kept per page between steps.
const downloads = new WeakMap<Page, Download>();
const exports = new WeakMap<Page, FieldExport>();

// The browser names the file by its own local date, and runs on this machine.
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function openList(page: Page): Promise<void> {
  await page.goto('/dev/field');
  // The buttons arrive once IndexedDB has answered.
  await expect(page.getByRole('button', { name: 'Add garment', exact: true })).toBeVisible();
}

Given('my camera sees a garment', async ({ page }) => {
  await fakeCamera(page, 'garment');
});

When('I add the garment {string} with one color', async ({ page }, label: string) => {
  await page.goto('/dev/field/new');
  await page.getByLabel('Label', { exact: true }).fill(label);
  await page.getByRole('radio', { name: 'One color', exact: true }).check();
  await page.getByRole('button', { name: 'Save garment', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: label, exact: true })).toBeVisible();
});

// One tap, once the video has a frame. The camera steps retry the shutter
// until the URL changes, but this screen stays put, and a retry after a tap
// that did land would store a second capture.
When('I capture it in {string}', async ({ page }, light: string) => {
  await page
    .getByRole('group', { name: 'Light' })
    .getByRole('button', { name: light, exact: true })
    .click();
  await page.getByRole('button', { name: 'Capture', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Capture / })).toBeVisible();
  await expect
    .poll(() =>
      page.locator('video').evaluate((video: HTMLVideoElement) => {
        return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
      }),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Take photo', exact: true }).click();
  await expect(page.locator('[data-toast]')).toContainText(`Captured: ${light}.`);
});

Then('the garment {string} has {int} capture(s)', async ({ page }, label: string, n: number) => {
  await openList(page);
  const card = page.getByRole('link', { name: label });
  await expect(card).toContainText(n === 1 ? '1 capture' : `${n} captures`);
  await card.click();
  await expect(page.getByRole('heading', { level: 1, name: label, exact: true })).toBeVisible();
  // Each capture is listed with its frame, read back from the store.
  await expect(page.getByRole('img', { name: 'Your photo' })).toHaveCount(n);
});

// Retried like the camera steps' shutter: until the confirm screen opens, a
// tap before the first frame does nothing.
When('I photograph a top and turn on Record in {string}', async ({ page }, light: string) => {
  await page.goto('/camera?slot=top');
  await expect(async () => {
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await expect(page).toHaveURL(/\/confirm\?slot=top$/, { timeout: 500 });
  }).toPass();
  const record = page.getByRole('button', { name: 'Record', exact: true });
  await record.click();
  await expect(record).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('group', { name: 'Light' })
    .getByRole('button', { name: light, exact: true })
    .click();
});

When('I accept the reading', async ({ page }) => {
  await page.getByRole('button', { name: 'Looks right', exact: true }).click();
});

Then('the field recorder lists {int} capture(s) from normal use', async ({ page }, n: number) => {
  await openList(page);
  const section = page.locator('section', {
    has: page.getByRole('heading', { level: 2, name: 'From normal use' }),
  });
  await expect(section.getByRole('listitem')).toHaveCount(n);
  await expect(section.getByRole('img', { name: 'Your photo' })).toHaveCount(n);
});

When('I export the field set', async ({ page }) => {
  await openList(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  downloads.set(page, download);
});

Then(
  'the download {string} unzips to version {int} with {int} garment(s) and {int} capture(s)',
  async ({ page }, name: string, version: number, garments: number, captures: number) => {
    const download = downloads.get(page);
    expect(download, 'no export was downloaded').toBeDefined();
    expect(download!.suggestedFilename()).toBe(name.replace('<today>', today()));
    const json = gunzipSync(await readFile(await download!.path())).toString('utf8');
    const raw = JSON.parse(json) as { version: unknown; garments: unknown[]; captures: unknown[] };
    expect(raw.version).toBe(version);
    expect(raw.garments).toHaveLength(garments);
    expect(raw.captures).toHaveLength(captures);
    // Also checks every frame's bytes fill its stated size, and throws if not.
    exports.set(page, decodeFieldExport(json));
  },
);

Then("that capture's frame has width × height × 4 bytes", ({ page }) => {
  const set = exports.get(page);
  expect(set, 'no export was read').toBeDefined();
  const [capture] = set!.captures;
  expect(capture!.pixels.width).toBe(capture!.width);
  expect(capture!.pixels.height).toBe(capture!.height);
  expect(capture!.pixels.data).toHaveLength(capture!.width * capture!.height * 4);
});

When('I delete the garment {string}', async ({ page }, label: string) => {
  await openList(page);
  await page.getByRole('link', { name: label }).click();
  await page.getByRole('button', { name: 'Delete garment', exact: true }).click();
  await page
    .getByRole('dialog', { name: `Delete ${label} and its 1 captures?` })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(page).toHaveURL(/\/dev\/field$/);
});

// Export takes only what the store still lists, so with the garment's capture
// gone there is nothing left to export.
Then('Export is disabled', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeDisabled();
  await expect(page.getByText('0 captures, about 0.0 MB', { exact: true })).toBeVisible();
});
