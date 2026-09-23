import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutfitsProvider } from '../features/saved/OutfitsProvider';
import { fakeOutfitStore, makeOutfit, type FakeOutfitStore } from '../features/saved/testing';
import type { SessionAction } from '../session/types';
import { SessionProvider } from '../session/SessionProvider';
import { useSession } from '../session/useSession';
import { Announcer } from '../ui/Announcer';
import { ToastHost } from './ToastHost';

function Trigger({ action }: { action: SessionAction }) {
  const { dispatch } = useSession();
  return (
    <main>
      <h1 tabIndex={-1}>Screen</h1>
      <button type="button" onClick={() => dispatch(action)}>
        trigger
      </button>
    </main>
  );
}

// Async and flushed under act() so the provider's initial `store.list()`
// settles before a test proceeds; without that flush, the fake store's
// already-resolved promise lands its setState after render() returns, outside
// any act(), and React warns on every test that does not otherwise await.
async function setup(action: SessionAction | null, store: FakeOutfitStore = fakeOutfitStore()) {
  render(
    <SessionProvider>
      <OutfitsProvider store={store}>
        <Announcer>
          {action && <Trigger action={action} />}
          <ToastHost />
        </Announcer>
      </OutfitsProvider>
    </SessionProvider>,
  );
  await act(async () => {});
  if (action) fireEvent.click(screen.getByRole('button', { name: 'trigger' }));
  return store;
}

const toastRoot = () => document.querySelector('[data-toast]');

const UNDO_ACTION = { label: 'Undo', kind: 'undoDelete', outfits: [makeOutfit()] } as const;

const REMOVED: SessionAction = {
  type: 'toastShown',
  message: 'Removed from saved',
  action: { ...UNDO_ACTION, outfits: [...UNDO_ACTION.outfits] },
};

const DELETED: SessionAction = {
  type: 'toastShown',
  message: 'Deleted Navy bottom',
  action: { ...UNDO_ACTION, outfits: [...UNDO_ACTION.outfits] },
  focusAction: true,
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastHost', () => {
  it('shows nothing without a toast', async () => {
    await setup(null);
    expect(toastRoot()).toBeNull();
  });

  it('shows and announces a toast, then lets it go after the short dwell', async () => {
    await setup({ type: 'toastShown', message: 'Saved' });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(toastRoot()).toHaveTextContent('Saved');
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(toastRoot()).toBeNull();
  });

  it('keeps a toast with an action for the longer dwell, and leaves focus alone', async () => {
    await setup(REMOVED);
    const trigger = screen.getByRole('button', { name: 'trigger' });
    act(() => trigger.focus());
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(toastRoot()).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('moves focus to the action when asked', async () => {
    await setup(DELETED);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
  });

  it('restores the outfits on Undo and puts focus on the heading', async () => {
    const store = await setup(DELETED);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      await Promise.resolve();
    });
    expect(store.contents()).toEqual([makeOutfit()]);
    expect(toastRoot()).toBeNull();
    expect(screen.getByRole('heading', { name: 'Screen' })).toHaveFocus();
  });

  it('says so when Undo could not restore', async () => {
    const store = fakeOutfitStore();
    store.fail.save = true;
    await setup(DELETED, store);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      await Promise.resolve();
    });
    expect(toastRoot()).toHaveTextContent("Couldn't restore this outfit.");
  });
});
