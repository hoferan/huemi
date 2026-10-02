import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PALETTE } from '../color/palette';
import { parseHex } from '../model/hex';
import { Swatch } from './Swatch';

describe('Swatch', () => {
  it('names the colour rather than showing only a hex', () => {
    render(<Swatch hex={parseHex('#1f2a44')} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Navy' })).toBeInTheDocument();
  });

  // The printed name is what tells Forest from Olive for someone who cannot
  // see the difference, so it must not be the screen-reader-only text it once
  // was. Whether it shows on screen is `e2e/features/pick.feature`'s check.
  it('prints its name rather than hiding it for screen readers', () => {
    render(<Swatch hex={parseHex('#1f2a44')} onSelect={() => {}} />);
    const name = within(screen.getByRole('button', { name: 'Navy' })).getByText('Navy');
    expect(name).not.toHaveAttribute('style');
  });

  it('describes a colour the palette cannot name', () => {
    render(<Swatch hex={parseHex('#00ff00')} onSelect={() => {}} />);
    // Past NAME_MAX_DISTANCE colorName describes rather than claims a name,
    // so the accessible name must not be any confident palette word, not
    // just the nearest one.
    for (const { name } of PALETTE) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.getByRole('button')).toHaveAccessibleName(/green/i);
  });

  it('passes the hex it was given to its handler', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Swatch hex={parseHex('#1f2a44')} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: 'Navy' }));
    expect(onSelect).toHaveBeenCalledWith('#1f2a44');
  });
});
