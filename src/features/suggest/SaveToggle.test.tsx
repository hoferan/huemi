import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { composeOutfit } from '../../session/select';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { buildOutfit } from '../saved/buildOutfit';
import { OutfitsProvider } from '../saved/OutfitsProvider';
import { fakeOutfitStore, NAVY_BOTTOM, type FakeOutfitStore } from '../saved/testing';
import { Suggestions } from './Suggestions';

const URL = '/suggest?slot=bottom&hex=%231f2a44';
const SEED = composeOutfit(NAVY_BOTTOM, {}, () => 0);

/** The toast is rendered by the shell, which a feature test may not import. */
function ToastText() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

function setup(store: FakeOutfitStore = fakeOutfitStore()) {
  render(
    <MemoryRouter initialEntries={[URL]}>
      <InitialLocationContext value={true}>
        <SessionProvider>
          <OutfitsProvider store={store}>
            <Announcer>
              <Routes>
                <Route path="/suggest" element={<Suggestions />} />
              </Routes>
              <ToastText />
            </Announcer>
          </OutfitsProvider>
        </SessionProvider>
      </InitialLocationContext>
    </MemoryRouter>,
  );
  return {
    store,
    user: userEvent.setup(),
    toggle: () => screen.getByRole('button', { name: 'Save outfit' }),
  };
}

describe('SaveToggle', () => {
  it('starts unpressed and saves what is on screen', async () => {
    const { store, user, toggle } = setup();
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'));
    await user.click(toggle());
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'true'));
    expect(store.contents()).toHaveLength(1);
    expect(store.contents()[0]!.pieces).toEqual(
      buildOutfit(NAVY_BOTTOM, SEED, 'x', new Date()).pieces,
    );
    expect(store.contents()[0]!.name).toBe('Navy bottom');
    expect(screen.getByTestId('toast')).toHaveTextContent('Saved');
  });

  it('arrives pressed when this combination is already saved', async () => {
    const { toggle } = setup(fakeOutfitStore([buildOutfit(NAVY_BOTTOM, SEED, 'old', new Date())]));
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'true'));
  });

  it('empties when a piece changes', async () => {
    const { user, toggle } = setup(
      fakeOutfitStore([buildOutfit(NAVY_BOTTOM, SEED, 'old', new Date())]),
    );
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'true'));
    await user.click(screen.getByRole('button', { name: 'Next suggestion for Shoes' }));
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('removes when pressed, and offers Undo with what it removed', async () => {
    const saved = buildOutfit(NAVY_BOTTOM, SEED, 'old', new Date());
    const { store, user, toggle } = setup(fakeOutfitStore([saved]));
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'true'));
    await user.click(toggle());
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'));
    expect(store.contents()).toEqual([]);
    expect(screen.getByTestId('toast')).toHaveTextContent('Removed from saved');
  });

  it('says so when the save fails, and stays unpressed', async () => {
    const store = fakeOutfitStore();
    store.fail.save = true;
    const { user, toggle } = setup(store);
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'));
    await user.click(toggle());
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent(
        "Couldn't save this outfit on this device.",
      ),
    );
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('says so when the removal fails', async () => {
    const store = fakeOutfitStore([buildOutfit(NAVY_BOTTOM, SEED, 'old', new Date())]);
    store.fail.remove = true;
    const { user, toggle } = setup(store);
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'true'));
    await user.click(toggle());
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't remove this outfit."),
    );
  });

  // Review focus: a second tap before the first save lands must not save twice.
  //
  // `userEvent.dblClick` inserts a real tick between the two clicks. That is
  // enough time for the fake store's promise chain to settle and a re-render
  // to land before the second click fires, so it never observes the race this
  // test means to guard against. Firing both clicks with `fireEvent` back to
  // back, with no `await` between them, is what actually lands the second tap
  // while the first save is still in flight.
  it('saves once when tapped twice quickly', async () => {
    const { store, toggle } = setup();
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'));
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'true'));
    expect(store.contents()).toHaveLength(1);
  });
});
