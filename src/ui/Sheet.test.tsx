import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sheet } from './Sheet';

function open(onOpenChange = vi.fn()) {
  render(
    <Sheet open onOpenChange={onOpenChange} title="Other options for Shoes">
      <button type="button">Navy</button>
    </Sheet>,
  );
  return onOpenChange;
}

describe('Sheet', () => {
  it('names itself as a dialog', () => {
    open();
    expect(screen.getByRole('dialog', { name: 'Other options for Shoes' })).toBeInTheDocument();
  });

  it('shows what it was given', () => {
    open();
    expect(screen.getByRole('button', { name: 'Navy' })).toBeInTheDocument();
  });

  it('closes on escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = open();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing when closed', () => {
    render(
      <Sheet open={false} onOpenChange={vi.fn()} title="Other options for Shoes">
        <button type="button">Navy</button>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // The handle is the drag target and has no other job, so it needs a name a
  // keyboard user can reach and act on — escape and the scrim are the other
  // two ways out, and neither is discoverable by touch.
  it('offers a labelled close control', async () => {
    const user = userEvent.setup();
    const onOpenChange = open();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
