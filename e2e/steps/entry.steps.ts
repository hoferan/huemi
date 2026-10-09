import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { seedOnboarded } from '../seedOnboarded';

const { Given, Then } = createBdd();

Given('I open huemi', async ({ page }) => {
  await page.goto('/');
});

Given('an earlier version left a correction log', async ({ page }) => {
  // Before any page script, so the app's start finds it there. The key is the
  // one `src/storage/forgetCorrections.ts` deletes.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'huemi.corrections',
      '[{"slot":"top","read":"#ad9684","corrected":"#e3b8a0","at":"2026-09-30T10:00:00.000Z"}]',
    );
  });
});

Then('no correction log is kept', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('huemi.corrections'))).toBeNull();
});

Given('I have seen the welcome screen', async ({ page }) => {
  // seedOnboarded runs before any page script, via addInitScript, so the
  // gate's first read already sees the flag. Setting it after goto would
  // race the redirect.
  await seedOnboarded(page);
});

// Converts a hex color such as "#1f2a44" to the rgb(...) string a browser
// reports for a computed style, since toHaveCSS compares against whatever
// getComputedStyle actually returns.
export function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

Then(
  'the steps fill the screen above {string}, each at least {int} tall',
  async ({ page }, button: string, min: number) => {
    // `all()` reads the list as it stands and does not wait for it, so the
    // count is asserted first to give the welcome screen time to render.
    const items = page.getByRole('main').getByRole('listitem');
    await expect(items).toHaveCount(3);
    const steps = await items.all();
    for (const step of steps) {
      expect((await step.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(min);
    }
    const last = (await steps[2]!.boundingBox())!;
    const start = (await page.getByRole('button', { name: button }).boundingBox())!;
    const viewport = page.viewportSize()!;
    // The steps end just above Start, and Start ends just above the bottom.
    expect(start.y - (last.y + last.height)).toBeLessThanOrEqual(32);
    expect(start.y + start.height).toBeGreaterThan(viewport.height - 48);
    expect(start.y + start.height).toBeLessThanOrEqual(viewport.height);
  },
);

// StyleX only paints in a real build, so this is where the preview's colors
// are seen at all. A block left transparent would be a preview of nothing.
Then('each step shows its preview in color', async ({ page }) => {
  const painted = await page
    .getByTestId('step-preview')
    .evaluateAll((previews) =>
      previews.map(
        (preview) =>
          [...preview.children].filter(
            (block) => getComputedStyle(block).backgroundColor !== 'rgba(0, 0, 0, 0)',
          ).length,
      ),
    );
  // One garment, then all three, then all three kept.
  expect(painted).toEqual([1, 3, 3]);
});

Then('the button {string} is at least {int} tall', async ({ page }, name: string, min: number) => {
  const box = await page.getByRole('button', { name }).boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(min);
});

Then('I see the heading {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
});

Then(
  'the button {string} has background {string}',
  async ({ page }, label: string, hex: string) => {
    // This is the assertion Vitest cannot make: StyleX injects its
    // aggregated CSS from a Vite build hook that Vitest never calls, so
    // there is no StyleX CSS in jsdom at all. Only a real build proves the
    // color actually reached the browser, not just that a class name was
    // generated. If this fails with a transparent or unset background, the
    // StyleX plugin order in vite.config.ts is wrong, or the CSS entrypoint
    // import is missing — fix that rather than weakening this assertion.
    //
    // This is a weaker proof than the spike screen's was: it checks the
    // "Take a photo" button's background against `tokens.primary`, a
    // compile-time token, rather than against a literal runtime hex chosen
    // independently of the source. #15 owes the runtime-hex assertion back
    // once the palette swatches land.
    await expect(page.getByRole('button', { name: label })).toHaveCSS(
      'background-color',
      hexToRgb(hex),
    );
  },
);
