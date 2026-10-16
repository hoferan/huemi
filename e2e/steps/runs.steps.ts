import { expect, type Locator, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

// The colors the vote card showed, kept per page from one step to the next.
const noted = new WeakMap<Page, string[]>();

async function setup(page: Page, route: string, length: number, light?: string): Promise<void> {
  await page.goto(route);
  await page
    .getByRole('group', { name: 'Number of questions' })
    .getByRole('button', { name: String(length), exact: true })
    .click();
  if (light) {
    await page
      .getByRole('group', { name: 'Light' })
      .getByRole('button', { name: light, exact: true })
      .click();
  }
  await page.getByRole('button', { name: 'Start', exact: true }).click();
}

// Retried like the camera steps' shutter: until the vote opens, a tap before
// the first frame does nothing.
async function photograph(page: Page): Promise<void> {
  await expect(async () => {
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Yes', exact: true })).toBeVisible({
      timeout: 500,
    });
  }).toPass();
}

When(
  'I start a reading run of {int} under {string}',
  async ({ page }, n: number, light: string) => {
    await setup(page, '/dev/runs/reading', n, light);
  },
);

When('I start a matching run of {int}', async ({ page }, n: number) => {
  await setup(page, '/dev/runs/matching', n);
});

// The progress moves to the next question, or the summary comes up, only once
// the answer is stored. Leaving the page before then would drop the save.
async function stored(page: Page, index: number): Promise<void> {
  await expect(
    page
      .getByText(new RegExp(`^${index + 2} of \\d+$`))
      .or(page.getByRole('button', { name: 'Another run', exact: true })),
  ).toBeVisible();
}

When('I answer Yes to {int} reading(s)', async ({ page }, n: number) => {
  for (let i = 0; i < n; i += 1) {
    await photograph(page);
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await stored(page, i);
  }
});

// A neighbour is a swatch other than the pressed one, the reading itself. An
// unchanged color would save nothing, so this is a real correction.
When('I answer No to a reading and pick a neighbouring color', async ({ page }) => {
  await photograph(page);
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await page
    .getByRole('group', { name: 'Closer to one of these?' })
    .locator('button[aria-pressed="false"]')
    .first()
    .click();
  await page.getByRole('button', { name: 'Use this color', exact: true }).click();
});

When('I answer Yes to {int} pair(s)', async ({ page }, n: number) => {
  for (let i = 0; i < n; i += 1) {
    // The progress names the pair the card shows, so the next tap is on the next card.
    await expect(page.getByText(new RegExp(`^${i + 1} of \\d+$`))).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await stored(page, i);
  }
});

// The next screen after an answer carries Undo, on the camera or the card.
// The question's number goes back one once the store has deleted the answer.
When('I take back the last answer', async ({ page }) => {
  const progress = page.getByText(/^\d+ of \d+$/);
  const before = await progress.textContent();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(progress).not.toHaveText(before!);
});

Then('the summary says {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});

Then('the field recorder lists {int} capture(s) from guided runs', async ({ page }, n: number) => {
  await page.goto('/dev/field');
  await expect(
    page.getByText(n === 1 ? '1 capture from guided runs' : `${n} captures from guided runs`, {
      exact: true,
    }),
  ).toBeVisible();
});

// The block's own colors, read as the browser painted them. The label above a
// name is the block's first child, so its parent is the block.
function blocks(page: Page): Locator[] {
  const card = page.getByRole('group', { name: 'Would you wear these together?' });
  return ['Top', 'Bottom'].map((slot) => card.getByText(slot, { exact: true }).locator('..'));
}

When('I note the colors of the pair on the card', async ({ page }) => {
  const colors: string[] = [];
  for (const block of blocks(page)) {
    colors.push(await block.evaluate((el) => getComputedStyle(el).backgroundColor));
  }
  noted.set(page, colors);
});

const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

// Read from the database, so the hexes are what the run drew rather than what
// the page reports of itself.
Then('the stored vote holds the colors I saw on the card', async ({ page }) => {
  const seen = noted.get(page);
  expect(seen, 'no colors were noted').toBeDefined();
  await page.goto('/dev/field');
  await expect(page.getByText('1 pair vote', { exact: true })).toBeVisible();
  const vote = await page.evaluate(
    () =>
      new Promise<{ top: string; bottom: string }>((resolve, reject) => {
        const open = indexedDB.open('huemi-field');
        open.onerror = () => reject(open.error ?? new Error('open failed'));
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('votes').objectStore('votes').getAll();
          request.onsuccess = () => {
            db.close();
            resolve((request.result as { top: string; bottom: string }[])[0]!);
          };
          request.onerror = () => {
            db.close();
            reject(request.error ?? new Error('read failed'));
          };
        };
      }),
  );
  expect(seen).toEqual([rgb(vote.top), rgb(vote.bottom)]);
});

async function confirmDelete(page: Page, action: string): Promise<void> {
  await page.getByRole('button', { name: action, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

When('I delete the run captures', async ({ page }) => {
  await confirmDelete(page, 'Delete run captures');
});

When('I delete the votes', async ({ page }) => {
  await confirmDelete(page, 'Delete votes');
});
