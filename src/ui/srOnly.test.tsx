import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { Announcer } from './Announcer';
import { SR_ONLY } from './srOnly';
import { Swatch } from './Swatch';

describe('visually hidden screen-reader text', () => {
  // jsdom computes no layout, so nothing here can observe the element being
  // hidden on screen — that half is Playwright's job, in
  // `e2e/invariants.spec.ts`'s "keeps its screen-reader-only live region
  // visually clipped" check, which reads the real computed `clip-path`. What
  // a unit test *can* pin down is that the properties doing the clipping are
  // still present on the shared object at all. Without this, `SR_ONLY = {}`
  // makes both elements' `style` attributes equal `null`, and the test below
  // this one — which only compares the two attributes to each other — passes
  // on a style that hides nothing.
  it('carries the properties that clip it from view, not just an equal style', () => {
    expect(SR_ONLY.clipPath).toBe('inset(50%)');
    expect(SR_ONLY.clip).toBe('rect(0 0 0 0)');
  });

  it('renders the same hidden-text style in Announcer and Swatch', () => {
    render(
      <Announcer>
        <Swatch hex={parseHex('#1f2a44')} onSelect={() => {}} />
      </Announcer>,
    );
    const region = screen.getByRole('status');
    const button = screen.getByRole('button', { name: 'Navy' });
    const hiddenSpan = button.querySelector('span');

    expect(hiddenSpan).not.toBeNull();
    // Same style attribute string implies both were rendered from the one
    // shared style object rather than two copies that can drift apart.
    expect(hiddenSpan?.getAttribute('style')).toBe(region.getAttribute('style'));
  });

  it("nests the swatch's hidden name inside the button it names", () => {
    render(<Swatch hex={parseHex('#1f2a44')} onSelect={() => {}} />);
    const button = screen.getByRole('button', { name: 'Navy' });
    const hiddenSpan = button.querySelector('span');

    // jsdom computes no layout, so containment-by-positioning cannot be
    // observed here; this only proves the span is a DOM descendant of the
    // button it names, which is the structural half of that contract.
    expect(hiddenSpan).not.toBeNull();
    expect(button.contains(hiddenSpan)).toBe(true);
  });
});
