import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutfitsProvider } from '../features/saved/OutfitsProvider';
import {
  fakeOutfitStore,
  makeOutfit,
  NAVY_BOTTOM,
  type FakeOutfitStore,
} from '../features/saved/testing';
import { useOutfits } from '../features/saved/useOutfits';
import type { SessionAction } from '../session/types';
import { AnnounceContext } from '../ui/AnnounceContext';
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
      <ReplaceTrigger />
    </main>
  );
}

// A second control, for the tests that replace one toast with another
// directly, the way `SaveToggle` and delete both do: a fresh `toastShown`
// with no dismissal of the one it replaces.
function ReplaceTrigger() {
  const { dispatch } = useSession();
  return (
    <button type="button" onClick={() => dispatch({ type: 'toastShown', message: 'Saved' })}>
      replace
    </button>
  );
}

// A change the session makes with no toast involved, to prove a re-render it
// causes does not announce the toast a second time.
function UnrelatedTrigger() {
  const { dispatch } = useSession();
  return (
    <button
      type="button"
      onClick={() =>
        dispatch({ type: 'pickChanged', slot: 'top', hex: NAVY_BOTTOM.hex, cursor: 0 })
      }
    >
      unrelated
    </button>
  );
}

// Stands in for the saved screen: a card per outfit, with the id `ToastHost`
// looks for after a restore. Only rendered by tests that check what happens
// when that screen is actually on show.
function OutfitCards() {
  const outfits = useOutfits();
  if (outfits.state.status !== 'ready') return null;
  return (
    <>
      {outfits.state.outfits.map((outfit) => (
        <button key={outfit.id} type="button" id={`outfit-${outfit.id}`}>
          {outfit.name}
        </button>
      ))}
    </>
  );
}

// Async and flushed under act() so the provider's initial `store.list()`
// settles before a test proceeds; without that flush, the fake store's
// already-resolved promise lands its setState after render() returns, outside
// any act(), and React warns on every test that does not otherwise await.
async function setup(
  action: SessionAction | null,
  store: FakeOutfitStore = fakeOutfitStore(),
  { withCards = false }: { withCards?: boolean } = {},
) {
  render(
    <SessionProvider>
      <OutfitsProvider store={store}>
        <Announcer>
          {action && <Trigger action={action} />}
          {withCards && <OutfitCards />}
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

  it('focuses the restored card instead of the heading when it is on screen', async () => {
    const store = await setup(DELETED, undefined, { withCards: true });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      await Promise.resolve();
    });
    expect(store.contents()).toEqual([makeOutfit()]);
    expect(toastRoot()).toBeNull();
    expect(screen.getByRole('button', { name: makeOutfit().name })).toHaveFocus();
  });

  // F4: replacing a toast unmounts the old one directly, with no dismissal
  // of its own to move focus, so it must not be left to fall to `<body>`.
  it('sends focus to the heading when a toast replaces one whose action had focus', async () => {
    await setup(DELETED);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'replace' }));
    expect(screen.getByRole('heading', { name: 'Screen' })).toHaveFocus();
  });

  it('leaves focus alone when a toast replaces one whose action did not have it', async () => {
    await setup(REMOVED);
    const trigger = screen.getByRole('button', { name: 'trigger' });
    act(() => trigger.focus());
    fireEvent.click(screen.getByRole('button', { name: 'replace' }));
    expect(trigger).toHaveFocus();
  });

  // F5: a replacement toast owes nothing to the timer it interrupted.
  it('gives a replacement toast its own full dwell, and drops the old timer', async () => {
    await setup(REMOVED);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(toastRoot()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'replace' }));
    // The moment REMOVED's own 5000ms dwell would have fired (3000 + 2000).
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(toastRoot()).not.toBeNull();
    // The rest of the replacement's own 2500ms dwell.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(toastRoot()).toBeNull();
  });

  // F5: each toast is announced exactly once, so a screen reader never hears
  // it twice, even when something unrelated re-renders ToastHost afterwards.
  it('announces a toast once, and not again for an unrelated re-render', async () => {
    const announce = vi.fn();
    render(
      <SessionProvider>
        <OutfitsProvider store={fakeOutfitStore()}>
          <AnnounceContext value={announce}>
            <Trigger action={{ type: 'toastShown', message: 'Saved' }} />
            <UnrelatedTrigger />
            <ToastHost />
          </AnnounceContext>
        </OutfitsProvider>
      </SessionProvider>,
    );
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));
    expect(announce).toHaveBeenCalledOnce();
    expect(announce).toHaveBeenCalledWith('Saved');
    fireEvent.click(screen.getByRole('button', { name: 'unrelated' }));
    expect(announce).toHaveBeenCalledOnce();
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
