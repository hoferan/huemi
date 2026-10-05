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

type Rgb = [number, number, number];

/** A computed CSS color, "rgb(31, 42, 68)", as its three channels. */
function channels(css: string): Rgb {
  const [r, g, b] = css.match(/\d+/g)!.map(Number);
  return [r!, g!, b!];
}

/** Each block on screen: its background, and the foreground its text is drawn in. */
async function blocksOnScreen(page: Page): Promise<{ background: Rgb; foreground: Rgb }[]> {
  const styles = await page
    .getByRole('group', { name: /^(Outerwear|Top|Bottom|Shoes|Accessory): / })
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return { background: style.backgroundColor, foreground: style.color };
      }),
    );
  return styles.map(({ background, foreground }) => ({
    background: channels(background),
    foreground: channels(foreground),
  }));
}

type PaintedBlock = { color: Rgb; top: number; bottom: number; ink: number };

/**
 * The blocks in the shared picture, top to bottom, read down column x = 1000.
 * That column runs inside every block, 40 short of its right edge, so it
 * misses the start-aligned text and the 24 px corners. A block is a stretch
 * of one color longer than 40 px that is not tokens.bg, which leaves out the
 * antialiased rows at a block's edges and the gaps between blocks.
 *
 * `ink` counts the pixels of the given foregrounds, one per block in order,
 * where the block's name is set: the band of 34 px above its baseline, 32 in
 * from the bottom, over the first 400 px from the text's start.
 */
async function paintedBlocks(
  page: Page,
  dataUrl: string,
  foregrounds: Rgb[],
): Promise<PaintedBlock[]> {
  return page.evaluate(
    async ({ dataUrl, foregrounds }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const column = context.getImageData(1000, 0, 1, canvas.height).data;
      const at = (y: number): [number, number, number] => [
        column[y * 4]!,
        column[y * 4 + 1]!,
        column[y * 4 + 2]!,
      ];
      const found: { color: [number, number, number]; top: number; bottom: number; ink: number }[] =
        [];
      let start = 0;
      for (let y = 1; y <= canvas.height; y += 1) {
        const same =
          y < canvas.height && at(y).every((channel, index) => channel === at(start)[index]);
        if (same) continue;
        const [r, g, b] = at(start);
        if (y - start > 40 && !(r === 0xd8 && g === 0xd5 && b === 0xcf)) {
          found.push({ color: at(start), top: start, bottom: y, ink: 0 });
        }
        start = y;
      }
      found.forEach((block, index) => {
        const [fr, fg, fb] = foregrounds[index] ?? [-9, -9, -9];
        const band = context.getImageData(72, block.bottom - 32 - 34, 400, 34).data;
        for (let i = 0; i < band.length; i += 4) {
          const near =
            Math.abs(band[i]! - fr) <= 1 &&
            Math.abs(band[i + 1]! - fg) <= 1 &&
            Math.abs(band[i + 2]! - fb) <= 1;
          if (near) block.ink += 1;
        }
      });
      return found;
    },
    { dataUrl, foregrounds },
  );
}

const close = (a: Rgb, b: Rgb) => a.every((channel, index) => Math.abs(channel - b[index]!) <= 1);

Then('the picture shows the blocks on screen, head to toe', async ({ page }) => {
  const share = await theShare(page);
  const onScreen = await blocksOnScreen(page);
  const painted = await paintedBlocks(
    page,
    share.files[0]!.dataUrl,
    onScreen.map((block) => block.foreground),
  );

  expect(painted).toHaveLength(onScreen.length);
  painted.forEach((block, index) => {
    expect(close(block.color, onScreen[index]!.background)).toBe(true);
  });
});

// Solid strokes of a 44 px name cover far more than 150 pixels in a 400 by 34
// band. Without the text, or in the other foreground, the band holds none.
Then("each block's name is painted in the foreground the screen uses", async ({ page }) => {
  const share = await theShare(page);
  const onScreen = await blocksOnScreen(page);
  const painted = await paintedBlocks(
    page,
    share.files[0]!.dataUrl,
    onScreen.map((block) => block.foreground),
  );

  expect(painted).toHaveLength(onScreen.length);
  painted.forEach((block) => expect(block.ink).toBeGreaterThan(150));
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
