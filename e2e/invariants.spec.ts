// Invariants: things that must always hold, regardless of which screen is
// showing. Given-When-Then adds nothing to these, so they stay as plain
// Playwright specs instead of Gherkin scenarios (see ADR 0008).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

for (const route of ROUTES) {
  test(`has no detectable accessibility violations at ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test(`does not scroll horizontally at ${route}`, async ({ page }) => {
    await page.goto(route);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });

  // The 320px project already covers WCAG reflow. This covers what reflow
  // cannot see: content that exists but cannot be reached. Every prototype
  // screen is built never to scroll inside a fixed 390x844 frame, so at large
  // text sizes the suggestions screen has nowhere to go.
  //
  // Measuring the scrolling element alone would only catch a clamp on <html>
  // or <body>. The prototype's clamp is on a screen wrapper several levels
  // down, and content clipped inside it leaves the document itself the right
  // height, so every element is checked for hiding its own overflow.
  test(`keeps content reachable at 200% text size at ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.addStyleTag({ content: ':root { font-size: 32px }' });
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          const style = getComputedStyle(el);
          return style.overflowY === 'hidden' || style.overflowY === 'clip';
        })
        // One pixel of tolerance: sub-pixel layout rounding otherwise reports
        // a clip on elements that fit.
        .filter((el) => el.scrollHeight > el.clientHeight + 1)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
    );
    expect(clipped).toEqual([]);
  });
}
