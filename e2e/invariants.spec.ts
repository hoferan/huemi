// Invariants: things that must always hold, regardless of which screen is
// showing. Given-When-Then adds nothing to these, so they stay as plain
// Playwright specs instead of Gherkin scenarios (see ADR 0008).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
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

// Screens that settle after their first render, and the sign that they have.
// `/camera` renders an empty viewfinder until the camera answers, and a check
// that ran then would pass without ever measuring the shutter.
const READY: Readonly<Record<string, (page: Page) => Promise<void>>> = {
  '/camera?slot=top': (page) =>
    expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible(),
  // Redirects to the camera without a capture in the session, so wait for the
  // camera screen before checking.
  '/confirm?slot=top': (page) =>
    expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible(),
  // The outfit camera settles the same way, and the tap screen and the result
  // both redirect to it without a check in the session. Without these a check
  // could run between the redirect and the shutter, and find no controls.
  '/check': (page) => expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible(),
  '/check/tap': (page) => expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible(),
  '/check/result': (page) => expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible(),
};

async function visit(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await READY[route]?.(page);
}

for (const route of ROUTES) {
  test(`has no detectable accessibility violations at ${route}`, async ({ page }) => {
    await visit(page, route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test(`does not scroll horizontally at ${route}`, async ({ page }) => {
    await visit(page, route);
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
    await visit(page, route);
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
    await visit(page, route);
    const controls = await page.getByRole('link').or(page.getByRole('button')).all();
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  // A toast sits at the foot of the screen, which is where a screen keeps
  // its main actions, and it stays up to 5 seconds. A screen marks those
  // actions with `clearOfToasts` from `src/ui/toastClearance.ts` and the
  // toast floats above them; this is what finds a screen that forgot. It
  // looks only at controls in the band a toast covers when nothing lifts it,
  // so a lifted toast may still cover a colour block higher up the screen.
  //
  // The toast is raised on the suggestions screen and carried to the route by
  // a client-side navigation, the way a real one outlives a route change, and
  // the pointer rests on it so it cannot expire before the measurement.
  test(`keeps a toast off the controls at the foot of the screen at ${route}`, async ({ page }) => {
    await page.goto('/suggest?slot=top&hex=%23c39a3a');
    await page.getByRole('button', { name: 'Save outfit' }).click();
    await page.locator('[data-toast]').hover();
    await page.evaluate((to) => {
      history.pushState(null, '', to);
      dispatchEvent(new PopStateEvent('popstate'));
    }, route);
    await READY[route]?.(page);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('[data-toast]')).toBeVisible();
    const covered = await page.evaluate(() => {
      const toast = document.querySelector('[data-toast]')!.getBoundingClientRect();
      const band = window.innerHeight - 16 - toast.height;
      return [...document.querySelectorAll('a, button')]
        .filter((el) => !el.closest('[data-toast]'))
        .filter((el) => {
          const box = el.getBoundingClientRect();
          const inBand = box.bottom > band && box.top < window.innerHeight;
          const under =
            box.top < toast.bottom &&
            box.bottom > toast.top &&
            box.left < toast.right &&
            box.right > toast.left;
          return box.width > 0 && inBand && under;
        })
        .map((el) => el.getAttribute('aria-label') ?? el.textContent?.trim());
    });
    expect(covered).toEqual([]);
  });

  // Screen-reader-only text, which is Announcer's live region, hides itself
  // with `clip-path`, not `overflow`, precisely so it
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
    await visit(page, route);
    const clipPath = await page.getByRole('status').evaluate((el) => getComputedStyle(el).clipPath);
    expect(clipPath).not.toBe('none');
  });
}

// Clipping hides the live region's text but does not stop it overflowing its
// 1px box, and the region sits at the foot of the document, above the routes
// and after every screen. Its overflow used to extend the page: one line of
// scrollable blank below every screen once anything had been announced, and,
// past the width of the screen, a layout viewport wider than the phone, which
// cut the right-hand edge off every bottom sheet. Every route above is
// visited with the region empty, which is how that went unseen.
//
// The message is written straight into the region rather than raised through
// a screen, so the check does not depend on which screen can announce what.
test('keeps an announcement from growing the page', async ({ page }) => {
  await visit(page, '/');
  const size = () =>
    page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
  const before = await size();
  await page.getByRole('status').evaluate((region) => {
    region.textContent =
      'An announcement long enough to run well past the edge of any phone screen.';
  });
  expect(await size()).toEqual(before);
});
