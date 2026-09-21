import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { parseHex } from '../model/hex';
import { Swatch } from './Swatch';

describe('Swatch', () => {
  it('names the colour rather than showing only a hex', () => {
    render(<Swatch hex={parseHex('#1f2a44')} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Navy' })).toBeInTheDocument();
  });

  it('describes a colour the palette cannot name', () => {
    render(<Swatch hex={parseHex('#00ff00')} onSelect={() => {}} />);
    // Past NAME_MAX_DISTANCE colorName describes rather than claims a name,
    // so the accessible name must not be a confident palette word.
    expect(screen.queryByRole('button', { name: 'Forest' })).not.toBeInTheDocument();
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
