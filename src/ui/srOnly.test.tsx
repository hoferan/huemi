import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { Announcer } from './Announcer';
import { Swatch } from './Swatch';

describe('visually hidden screen-reader text', () => {
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
