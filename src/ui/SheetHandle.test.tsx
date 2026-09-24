import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SheetHandle } from './SheetHandle';

describe('SheetHandle', () => {
  it('closes on click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SheetHandle label="Close" onClose={onClose} onPointerDown={vi.fn()} dragged={() => false} />,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close a click that followed a drag', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SheetHandle label="Close" onClose={onClose} onPointerDown={vi.fn()} dragged={() => true} />,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reads the drag flag on a key press, so it does not linger for the next click', async () => {
    const user = userEvent.setup();
    const dragged = vi.fn(() => false);
    render(
      <SheetHandle label="Close" onClose={vi.fn()} onPointerDown={vi.fn()} dragged={dragged} />,
    );
    screen.getByRole('button', { name: 'Close' }).focus();
    await user.keyboard('{Enter}');
    expect(dragged).toHaveBeenCalled();
  });
});
