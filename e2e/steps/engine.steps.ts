import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { isUncovered, overlayPanel } from '../overlay';
import { hexToRgb } from './entry.steps';

const { Then } = createBdd();

const enginePanel = (page: import('@playwright/test').Page) => overlayPanel(page, /^Engine$/);

// StyleX emits no CSS under Vitest (ADR 0002), so the panel's colors and the
// box it covers can only be checked here. Every block on both screens is a
// group named for its slot.
Then(
  'the engine panel covers every block in {string} on {string}',
  async ({ page }, fg: string, bg: string) => {
    const panel = await enginePanel(page);
    await expect(panel).toHaveCSS('background-color', hexToRgb(bg));
    await expect(panel).toHaveCSS('color', hexToRgb(fg));
    const box = await panel.boundingBox();
    const blocks = await page
      .getByRole('group', { name: /^(Outerwear|Top|Bottom|Shoes|Accessory):/ })
      .all();
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      const area = await block.boundingBox();
      if (!box || !area) throw new Error('the engine panel or a block has not been laid out');
      expect(box.x).toBeLessThanOrEqual(area.x);
      expect(box.y).toBeLessThanOrEqual(area.y);
      expect(box.x + box.width).toBeGreaterThanOrEqual(area.x + area.width);
      expect(box.y + box.height).toBeGreaterThanOrEqual(area.y + area.height);
    }
  },
);

Then('the engine panel leaves the button {string} uncovered', async ({ page }, name: string) => {
  await enginePanel(page);
  expect(await isUncovered(page.getByRole('button', { name, exact: true }))).toBe(true);
});

// Closed, the chip sits at the top of the first block, and that block's slot
// label has to stay readable beside it. Measured against the text itself
// rather than its element, which spans the whole block, so a chip over the
// start of the word cannot slip past a hit test at the element's centre.
Then('the engine chip leaves {string} uncovered', async ({ page }, text: string) => {
  const chip = await page.getByRole('button', { name: 'Engine', exact: true }).boundingBox();
  const words = await page
    .getByText(text, { exact: true })
    .first()
    .evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const { x, y, width, height } = range.getBoundingClientRect();
      return { x, y, width, height };
    });
  if (!chip) throw new Error('the engine chip has not been laid out');
  const overlaps =
    chip.x < words.x + words.width &&
    words.x < chip.x + chip.width &&
    chip.y < words.y + words.height &&
    words.y < chip.y + chip.height;
  expect(overlaps).toBe(false);
});

// Keep and Next run the block's full height, and at 320px wide no 44px chip
// fits on a block without touching the top of one. What has to hold is that a
// tap on the icon still lands on the button.
Then('the engine chip leaves {string} tappable', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name: 'Engine', exact: true })).toBeVisible();
  expect(await isUncovered(page.getByRole('button', { name, exact: true }))).toBe(true);
});

Then('the engine panel leaves the text {string} uncovered', async ({ page }, text: string) => {
  await enginePanel(page);
  expect(await isUncovered(page.getByText(text, { exact: true }))).toBe(true);
});
