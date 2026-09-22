import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

  // Grab the handle, pull down, think better of it, pull back up, let go. The
  // drag decides to spring back and the browser still delivers a click,
  // because the press and the release were both inside the handle. Closing
  // there overrules the gesture the user just cancelled.
  it('stays open when a drag on the handle springs back', () => {
    const onOpenChange = vi.fn();
    open(onOpenChange);
    const handle = screen.getByRole('button', { name: /close/i });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 0, clientY: 30 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    fireEvent.click(handle);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  // Radix restores focus on close only through `Dialog.Trigger`: its modal
  // content prevents the default and focuses the trigger. This sheet has none,
  // so before the handler it carries now, closing it left focus on the body
  // and a keyboard user started again from the top of the document.
  it('gives focus back to whatever opened it', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Other options
          </button>
          {open && (
            <Sheet open onOpenChange={setOpen} title="Other options for Shoes">
              <button type="button" onClick={() => setOpen(false)}>
                Navy
              </button>
            </Sheet>
          )}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Other options' });
    await user.click(opener);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Navy' }));
    // Radix restores from a `setTimeout(0)` in the focus scope's cleanup,
    // working around a React bug about focusing during unmount, so it has not
    // happened yet when the click settles.
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  // The other half: suppressing the click must not outlive the drag that set
  // it, or the handle stops closing the sheet at all.
  it('still closes on the tap after a drag', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    open(onOpenChange);
    const handle = screen.getByRole('button', { name: /close/i });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 0, clientY: 30 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    fireEvent.click(handle);
    await user.click(handle);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
