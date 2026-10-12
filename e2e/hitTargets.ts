import type { Locator, Page } from '@playwright/test';

/**
 * Everything a finger has to hit, for the 44 by 44 check. A switch, a radio
 * and a checkbox are controls too, but their role is not `button`, so a check
 * that asked only for links and buttons walked past the Pieces sheet's
 * switches while A11Y.md said it measured them.
 */
export function hitTargets(page: Page): Locator {
  return page
    .getByRole('link')
    .or(page.getByRole('button'))
    .or(page.getByRole('switch'))
    .or(page.getByRole('radio'))
    .or(page.getByRole('checkbox'));
}
