// Invariants: things that must always hold, regardless of which screen is
// showing. Given-When-Then adds nothing to these, so they stay as plain
// Playwright specs instead of Gherkin scenarios (see ADR 0008).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';
import { seedOnboarded } from './seedOnboarded';
import { fakeCamera } from './fakeCamera';
import { seedOutfit } from './seedOutfit';

// Every route here is visited with onboarding already marked seen, so `/`
// renders the entry screen it is listed for rather than redirecting to
// `/welcome`. Without this, the gate sends `/` to onboarding for every one
// of these checks, and `/welcome` is the only screen among them that ever
// gets scanned — twice, while Entry gets scanned never. `/welcome` itself is
// unaffected: it renders onboarding regardless of the flag.
// Every route also has one saved outfit, so `/saved` is checked with a card
// on it rather than its empty state.
test.beforeEach(async ({ page }) => {
  await seedOnboarded(page);
  await seedOutfit(page);
  // A working camera for every route, so `/camera` is scanned in its live
  // state, the one with the shutter on it. Without this, headless Chromium
  // answers with whichever refusal its sandbox produces, which differs from
  // machine to machine. Routes that never ask for a camera are unaffected.
  await fakeCamera(page, 'bright');
});

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

  // A11Y.md's hit-target rule is stated in terms of the `touchTarget` token,
  // which `grep -rn "touchTarget" src/` confirms is used somewhere but not
  // which controls use it. Measuring every rendered link and button's actual
  // box is the only check that would have caught "Mix your own" and "Start
  // again": both used the token-sized `Button` and `Swatch` components
  // elsewhere, so a repo-wide grep for the token was already satisfied while
  // these two links, styled by hand, were not.
  test(`keeps every link and button at least a 44x44 hit target at ${route}`, async ({ page }) => {
    await page.goto(route);
    const controls = await page.getByRole('link').or(page.getByRole('button')).all();
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  // Screen-reader-only text (Announcer's live region, a Swatch's hidden
  // name) hides itself with `clip-path`, not `overflow`, precisely so it
  // stays reachable and un-clipped by the 200% text size check above. A unit
  // test can assert the SR_ONLY object still carries that property; it
  // cannot assert the browser actually honours it, since jsdom computes no
  // style for `clip-path`. This is that other half: if a later edit dropped
  // `clipPath` from `src/ui/srOnly.ts`, the live region would sit in normal
  // flow instead of being clipped away, and this would be the only check to
  // notice.
  test(`keeps its screen-reader-only live region visually clipped at ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    const clipPath = await page.getByRole('status').evaluate((el) => getComputedStyle(el).clipPath);
    expect(clipPath).not.toBe('none');
  });
}
