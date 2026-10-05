import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { fakeShare, type RecordedShare } from '../fakeShare';

const { Given, When, Then } = createBdd();

Given('my phone can share files', async ({ page }) => {
  await fakeShare(page, 'files');
});

Given('my phone can share only text', async ({ page }) => {
  await fakeShare(page, 'text');
});

Given('my browser has no share sheet', async ({ page }) => {
  await fakeShare(page, 'none');
});

Given('I will close the share sheet', async ({ page }) => {
  await fakeShare(page, 'dismiss');
});

When('I share the outfit', async ({ page }) => {
  await page.getByRole('button', { name: 'Share outfit' }).click();
});

async function shares(page: Page): Promise<RecordedShare[]> {
  return page.evaluate(() => (window as unknown as { __shares: RecordedShare[] }).__shares);
}

/** The one share the scenario made, once the fake sheet has recorded it. */
async function theShare(page: Page): Promise<RecordedShare> {
  await expect.poll(async () => (await shares(page)).length).toBe(1);
  return (await shares(page))[0]!;
}

/** "Top: Mustard" for every block on screen, head to toe, as `blockLabel` names them. */
async function blockNames(page: Page): Promise<string[]> {
  const blocks = page.getByRole('group', { name: /^(Outerwear|Top|Bottom|Shoes|Accessory): / });
  await expect(blocks).toHaveCount(5);
  return blocks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
}

/** The sentence `shareText` writes for those blocks: "Camel outerwear, mustard top, …". */
function sentenceFor(names: string[]): string {
  const sentence = names
    .map((label) => {
      const [slot, name] = label.split(': ') as [string, string];
      return `${name.toLowerCase()} ${slot.toLowerCase()}`;
    })
    .join(', ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

Then(
  'a PNG named {string} of {int} by {int} is shared',
  async ({ page }, name: string, width: number, height: number) => {
    const share = await theShare(page);
    expect(share.title).toBe('huemi outfit');
    expect(share.files).toHaveLength(1);
    expect(share.files[0]).toMatchObject({ name, type: 'image/png' });
    const size = await page.evaluate(async (dataUrl) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, share.files[0]!.dataUrl);
    expect(size).toEqual([width, height]);
  },
);

Then('the picture shows the blocks on screen, head to toe', async ({ page }) => {
  const share = await theShare(page);
  const onScreen = await page
    .getByRole('group', { name: /^(Outerwear|Top|Bottom|Shoes|Accessory): / })
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const [r, g, b] = getComputedStyle(node).backgroundColor.match(/\d+/g)!.map(Number);
        return [r!, g!, b!];
      }),
    );
  // Column x = 1000 runs inside every block, 40 short of its right edge, so
  // it misses the start-aligned text and the 24 px corners. A run is a
  // stretch of one color longer than 40 px, which leaves out the antialiased
  // rows at a block's top and bottom and the gaps between blocks.
  const runs = await page.evaluate(async (dataUrl) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const column = context.getImageData(1000, 0, 1, canvas.height).data;
    const found: number[][] = [];
    let start = 0;
    for (let y = 1; y <= canvas.height; y += 1) {
      const same =
        y < canvas.height &&
        [0, 1, 2].every((channel) => column[y * 4 + channel] === column[start * 4 + channel]);
      if (same) continue;
      if (y - start > 40)
        found.push([column[start * 4]!, column[start * 4 + 1]!, column[start * 4 + 2]!]);
      start = y;
    }
    return found;
  }, share.files[0]!.dataUrl);

  // tokens.bg, around and between the blocks.
  const blocks = runs.filter(([r, g, b]) => !(r === 0xd8 && g === 0xd5 && b === 0xcf));
  expect(blocks).toHaveLength(onScreen.length);
  blocks.forEach((pixel, index) => {
    pixel.forEach((channel, at) =>
      expect(Math.abs(channel - onScreen[index]![at]!)).toBeLessThanOrEqual(1),
    );
  });
});

Then('the shared text names every block on screen', async ({ page }) => {
  const share = await theShare(page);
  expect(share.text).toBe(sentenceFor(await blockNames(page)));
});

Then('the share has no file and names every block on screen', async ({ page }) => {
  const share = await theShare(page);
  expect(share.files).toEqual([]);
  expect(share.title).toBe('huemi outfit');
  expect(share.text).toBe(sentenceFor(await blockNames(page)));
});

Then('sharing the outfit downloads {string}', async ({ page }, name: string) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Share outfit' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(name);
});

// `[data-toast]` rather than the text: the live region repeats the message,
// so a text locator matches two elements.
Then('the toast says {string}', async ({ page }, message: string) => {
  await expect(page.locator('[data-toast]')).toContainText(message);
});

Then('the share sheet opened', async ({ page }) => {
  await theShare(page);
});

// Nothing to wait for when nothing should happen, so the step gives the
// dismissal a moment to have produced a toast if it was going to.
Then('no message appears', async ({ page }) => {
  await page.waitForTimeout(300);
  await expect(page.locator('[data-toast]')).toHaveCount(0);
});
