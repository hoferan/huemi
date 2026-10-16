import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { hexToRgb } from './entry.steps';
import { BLOCK_NAME } from './share.steps';
import { contrastRatio } from '../../src/color/contrast';
import { PALETTE } from '../../src/color/palette';
import { parseHex, type Hex } from '../../src/model/hex';

const { Given, When, Then } = createBdd();

const MUSTARD_TOP = '/suggest?slot=top&hex=%23c39a3a';
const TAN_SHOES = '/suggest?slot=shoes&hex=%23c9ad86';

Given('I prefer reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

When('I open the suggestions for a mustard top', async ({ page }) => {
  await page.goto(MUSTARD_TOP);
  // The screen seeds from an effect, so waiting for the heading is not enough:
  // the blocks arrive a tick later and a step that clicked Shuffle before then
  // would shuffle an outfit that was not there yet.
  await expect(page.getByRole('group', { name: /^Shoes:/ })).toBeVisible();
});

// Shoes, because a top, a bottom or a dress as the base settles the dress
// choice and the Pieces sheet then offers no radios.
When('I open the suggestions for tan shoes', async ({ page }) => {
  await page.goto(TAN_SHOES);
  await expect(page.getByRole('group', { name: /^Shoes:/ })).toBeVisible();
});

// Not scoped to the sheet: the check's list asks the same question on the page
// (#137), and an open sheet hides the page behind it from the accessibility tree.
When('I choose the radio {string}', async ({ page }, name: string) => {
  const radio = page.getByRole('radio', { name, exact: true });
  await radio.click();
  await expect(radio).toBeChecked();
});

Then('I see no {string} block', async ({ page }, slot: string) => {
  await expect(page.getByRole('group', { name: new RegExp(`^${slot}:`) })).toHaveCount(0);
});

// The composer picks the color, so the scenario cannot name it. The block
// does, "Dress: Rust, 1 of 21", and the palette holds the hex for that name:
// this asserts the rendered color is the one the block says it is.
Then('the {string} block shows the color it names', async ({ page }, slot: string) => {
  const block = page.getByRole('group', { name: new RegExp(`^${slot}: `) });
  const label = (await block.getAttribute('aria-label'))!;
  const name = label.slice(`${slot}: `.length).split(',')[0]!.trim();
  const color = PALETTE.find((entry) => entry.name === name);
  expect(color, `a palette color named ${name}`).toBeDefined();
  await expect(block).toHaveCSS('background-color', hexToRgb(color!.hex));
});

// Fake timers, then a pause. Everything the shuffle crossfade can be measured
// through is transient by construction: `shuffling` clears itself after
// `tokens.shuffle`, and after that the blocks read `colorFade` again. Polling
// for a computed style inside that window is a coin toss, and under reduced
// motion both durations are 0s, so a scenario that lost the race would pass
// while measuring the wrong thing. Holding the clock removes the window's end
// rather than betting on being quick.
//
// Installed after the page has loaded, so no timer the app needs during boot
// is caught by the pause.
When('time stops', async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(Date.now());
});

When('I shuffle', async ({ page }) => {
  await page.getByRole('button', { name: /^Shuffle/ }).click();
});

Then('the {string} block carries a suggestion', async ({ page }, slot: string) => {
  // Named, not just present: `blockLabel` writes "Shoes: Pale blue", so a block
  // that rendered without a colour could not produce this name.
  await expect(page.getByRole('group', { name: new RegExp(`^${slot}: \\S`) })).toBeVisible();
});

Then('the block {string} has background {string}', async ({ page }, slot: string, hex: string) => {
  // The runtime-hex assertion #15 owed back: this colour is not a token, it is
  // a value that travelled from the URL through the engine into a StyleX
  // dynamic style. A transparent result means the StyleX plugin order in
  // vite.config.ts is wrong, or the CSS entrypoint import is missing.
  await expect(page.getByRole('group', { name: new RegExp(`^${slot}:`) })).toHaveCSS(
    'background-color',
    hexToRgb(hex),
  );
});

Then('every control on the {string} block is at least 44 by 44', async ({ page }, slot: string) => {
  const block = page.getByRole('group', { name: new RegExp(`^${slot}:`) });
  const controls = block.getByRole('button');
  const count = await controls.count();
  // Three: the colour field, Keep and Next. A count that drops silently
  // would make this scenario pass while checking nothing.
  expect(count).toBe(3);
  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

// Kept for the two steps below, which measure whatever was focused rather than
// a control they name themselves. A step that re-queried by hand would keep
// passing after the scenario was pointed at a different control.
let focused = '';

When('I focus the {string} control', async ({ page }, name: string) => {
  focused = name;
  await page.getByRole('button', { name }).focus();
});

Then("its outline colour matches the block's foreground", async ({ page }) => {
  const control = page.getByRole('button', { name: focused });
  // currentColor is what readableForeground chose for this block, which is the
  // whole reason the ring is drawn from it: the browser default is picked
  // without knowing what is underneath.
  const [outline, color] = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.outlineColor, style.color];
  });
  expect(outline).toBe(color);
});

// The colour alone proves nothing about focus. `outlineColor` is set
// unconditionally, so it resolves against `color` on every control on the
// screen, focused or not, and the assertion above held before anything was
// focused. `outlineStyle` is the half that is conditioned on
// `:focus-visible`, so it is the half that says the ring is being drawn.
Then('the focus ring is drawn on it', async ({ page }) => {
  const control = page.getByRole('button', { name: focused });
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS('outline-style', 'solid');
  await expect(control).toHaveCSS('outline-width', '3px');
});

Then(
  'the {string} block has a transition duration of {string}',
  async ({ page }, slot: string, duration: string) => {
    const block = page.getByRole('group', { name: new RegExp(`^${slot}:`) });
    await expect(block).toHaveCSS('transition-duration', duration);
  },
);

When('I switch off {string}', async ({ page }, name: string) => {
  const toggle = page.getByRole('dialog').getByRole('switch', { name });
  await toggle.click();
  await expect(toggle).not.toBeChecked();
});

Then('I see {int} blocks', async ({ page }, count: number) => {
  await expect(page.getByRole('group', { name: BLOCK_NAME })).toHaveCount(count);
});

// WCAG 1.4.11 asks 3:1 of what identifies a control and its state, and axe
// does not measure it. Off is the state that matters: a switch the person
// turned off has to stay findable to turn back on.
Then('the {string} switch stands out from the sheet at 3:1', async ({ page }, name: string) => {
  const colors = await page
    .getByRole('dialog')
    .getByRole('switch', { name })
    .evaluate((control) => {
      const opaque = (el: Element | null): string => {
        for (let at = el; at; at = at.parentElement) {
          const color = getComputedStyle(at).backgroundColor;
          if (!/rgba\(.*, 0\)$/.test(color) && color !== 'transparent') return color;
        }
        return 'rgb(255, 255, 255)';
      };
      const [track, thumb] = [...control.children];
      return {
        sheet: opaque(control.parentElement),
        edge: getComputedStyle(track!).borderTopColor,
        track: getComputedStyle(track!).backgroundColor,
        thumb: getComputedStyle(thumb!).backgroundColor,
      };
    });
  const sheet = solid(colors.sheet, '#ffffff');
  const track = solid(colors.track, sheet);
  expect(contrastRatio(solid(colors.edge, sheet), sheet)).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(solid(colors.thumb, track), track)).toBeGreaterThanOrEqual(3);
});

// The same 3:1 for a radio. Unchosen is the state that matters, for the
// reason it is off for a switch: the ring is all there is to find it by. The
// radios sit in the Pieces sheet and on the check's list (#137).
Then('the {string} radio stands out from the sheet at 3:1', ({ page }, name: string) =>
  radioStandsOut(page, name),
);

Then('the {string} radio stands out from the page at 3:1', ({ page }, name: string) =>
  radioStandsOut(page, name),
);

async function radioStandsOut(page: Page, name: string) {
  const colors = await page.getByRole('radio', { name, exact: true }).evaluate((control) => {
    const opaque = (el: Element | null): string => {
      for (let at = el; at; at = at.parentElement) {
        const color = getComputedStyle(at).backgroundColor;
        if (!/rgba\(.*, 0\)$/.test(color) && color !== 'transparent') return color;
      }
      return 'rgb(255, 255, 255)';
    };
    return {
      sheet: opaque(control.parentElement),
      ring: getComputedStyle(control.children[0]!).borderTopColor,
    };
  });
  const sheet = solid(colors.sheet, '#ffffff');
  expect(contrastRatio(solid(colors.ring, sheet), sheet)).toBeGreaterThanOrEqual(3);
}

/** A computed `rgb()` or `rgba()` color, laid over `under` and written as a hex. */
function solid(css: string, under: string): Hex {
  const [r, g, b, a = 1] = css.match(/[\d.]+/g)!.map(Number);
  const base = parseHex(under);
  const below = [1, 3, 5].map((i) => Number.parseInt(base.slice(i, i + 2), 16));
  const mixed = [r!, g!, b!].map((c, i) => Math.round(c * a + below[i]! * (1 - a)));
  return parseHex(`#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`);
}

// The route sweep scrolls nothing sideways at default text and checks 200%
// text only for clipping, so a footer that grows past a narrow phone at large
// text passes both. This puts the two together where the footer is busiest.
When('my text is at 200%', async ({ page }) => {
  await page.addStyleTag({ content: ':root { font-size: 32px }' });
});

Then('the page does not scroll sideways', async ({ page }) => {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
