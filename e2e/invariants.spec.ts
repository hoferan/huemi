// Invariants: things that must always hold, regardless of which screen is
// showing. Given-When-Then adds nothing to these, so they stay as plain
// Playwright specs instead of Gherkin scenarios (see ADR 0008).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('does not scroll horizontally', async ({ page }) => {
  await page.goto('/');
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
