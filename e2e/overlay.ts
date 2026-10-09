import type { Locator, Page } from '@playwright/test';

/**
 * A developer-mode panel, found through its toggle's `aria-controls` the way a
 * screen reader finds it.
 */
export async function overlayPanel(page: Page, toggle: RegExp): Promise<Locator> {
  const button = page.getByRole('button', { name: toggle });
  const id = await button.getAttribute('aria-controls');
  if (!id) throw new Error(`the toggle ${toggle} controls nothing`);
  return page.locator(`[id="${id}"]`);
}

/**
 * Whether a tap at the element's centre would land on it, which it does only
 * if nothing is drawn over it.
 */
export async function isUncovered(element: Locator): Promise<boolean> {
  return element.evaluate((node) => {
    const { x, y, width, height } = node.getBoundingClientRect();
    const top = document.elementFromPoint(x + width / 2, y + height / 2);
    return top !== null && node.contains(top);
  });
}
