import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../color/palette';
import { parseHex } from '../model/hex';
import { ColorBlock } from './ColorBlock';

describe('ColorBlock', () => {
  it('names the group with the slot and the colour', () => {
    render(
      <ColorBlock slot="top" hex={parseHex('#a9bfd4')}>
        <span>contents</span>
      </ColorBlock>,
    );
    expect(screen.getByRole('group', { name: 'Top: Pale blue' })).toBeInTheDocument();
  });

  it('describes a colour the palette cannot name rather than claiming a word', () => {
    render(
      <ColorBlock slot="shoes" hex={parseHex('#00ff00')}>
        <span>contents</span>
      </ColorBlock>,
    );
    // Past NAME_MAX_DISTANCE colorName describes instead of naming, and
    // blockLabel inherits that. A confidently wrong palette word here reads
    // as information to the one user who has no other channel for the colour.
    for (const { name } of PALETTE) {
      expect(screen.queryByRole('group', { name: `Shoes: ${name}` })).not.toBeInTheDocument();
    }
    expect(screen.getByRole('group')).toHaveAccessibleName(/^Shoes: .*green/i);
  });

  it('renders what it is given', () => {
    render(
      <ColorBlock slot="bottom" hex={parseHex('#3d3d3f')}>
        <button type="button">Next suggestion for Bottom</button>
      </ColorBlock>,
    );
    expect(screen.getByRole('button', { name: 'Next suggestion for Bottom' })).toBeInTheDocument();
  });

  it('renders with a fade duration given by its caller', () => {
    // StyleX emits no CSS under Vitest (ADR 0002), so this asserts only that
    // the prop is accepted and the block still renders. The duration itself is
    // asserted in Playwright, against a real build.
    render(
      <ColorBlock slot="top" hex={parseHex('#c39a3a')} fade="200ms">
        <span>Mustard</span>
      </ColorBlock>,
    );
    expect(screen.getByRole('group')).toBeInTheDocument();
  });
});
