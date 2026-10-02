import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Announcer } from './Announcer';
import { SR_ONLY } from './srOnly';

describe('visually hidden screen-reader text', () => {
  // jsdom computes no layout, so nothing here can observe the element being
  // hidden on screen — that half is Playwright's job, in
  // `e2e/invariants.spec.ts`'s "keeps its screen-reader-only live region
  // visually clipped" check, which reads the real computed `clip-path`. What
  // a unit test *can* pin down is that the properties doing the clipping are
  // still present on the shared object at all, and that the live region is
  // rendered with it.
  it('carries the properties that clip it from view', () => {
    expect(SR_ONLY.clipPath).toBe('inset(50%)');
    expect(SR_ONLY.clip).toBe('rect(0 0 0 0)');
  });

  // The clip hides the text; this keeps its overflow from extending the page.
  // Whether the browser honours it is `e2e/invariants.spec.ts`'s check.
  it('contains its overflow, so hidden text cannot grow the page', () => {
    expect(SR_ONLY.contain).toBe('paint');
  });

  it('is the style the live region renders with', () => {
    render(<Announcer>{null}</Announcer>);
    expect(screen.getByRole('status')).toHaveStyle({ clipPath: 'inset(50%)', contain: 'paint' });
  });
});
