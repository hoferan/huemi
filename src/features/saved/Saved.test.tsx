import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import type { OutfitStore } from '../../storage/port';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { openOutfit } from './openOutfit';
import { OutfitsProvider } from './OutfitsProvider';
import { Saved } from './Saved';
import { fakeOutfitStore, makeOutfit, NAVY_BOTTOM } from './testing';

function Suggest() {
  const { pathname, search } = useLocation();
  const { state } = useSession();
  return (
    <>
      <p>{`at ${pathname}${search}`}</p>
      <p data-testid="picks">{JSON.stringify(state.picks)}</p>
    </>
  );
}

function ToastText() {
  const { state } = useSession();
  return (
    <p data-testid="toast">
      {state.toast ? `${state.toast.message}${state.toast.focusAction ? ' [focus]' : ''}` : ''}
    </p>
  );
}

function setup(store: OutfitStore) {
  render(
    <MemoryRouter initialEntries={['/saved']}>
      <InitialLocationContext value={true}>
        <SessionProvider>
          <OutfitsProvider store={store}>
            <Announcer>
              <Routes>
                <Route path="/saved" element={<Saved />} />
                <Route path="/suggest" element={<Suggest />} />
              </Routes>
              <ToastText />
            </Announcer>
          </OutfitsProvider>
        </SessionProvider>
      </InitialLocationContext>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('Saved', () => {
  it('shows only its heading while the list is loading', () => {
    const pending: OutfitStore = {
      list: () => new Promise(() => {}),
      save: () => new Promise(() => {}),
      remove: () => new Promise(() => {}),
    };
    setup(pending);
    expect(screen.getByRole('heading', { level: 1, name: 'Saved outfits' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByText(/Nothing saved yet/)).toBeNull();
  });

  it('says when nothing is saved', async () => {
    setup(fakeOutfitStore());
    expect(
      await screen.findByText('Nothing saved yet. Save an outfit from the suggestions screen.'),
    ).toBeInTheDocument();
  });

  it('says the list could not be read, and reads it again on request', async () => {
    const store = fakeOutfitStore([makeOutfit()]);
    store.fail.list = true;
    const user = setup(store);
    expect(
      await screen.findByText("Couldn't read your saved outfits on this device."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nothing saved yet/)).toBeNull();
    store.fail.list = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Navy bottom' })).toBeInTheDocument();
  });

  it('notes one outfit it could not read', async () => {
    setup(fakeOutfitStore([makeOutfit()], 1));
    expect(
      await screen.findByText("1 saved outfit couldn't be read and isn't shown."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Navy bottom' })).toBeInTheDocument();
  });

  // The empty sentence would be false: something is saved, just not readable.
  it('notes several unreadable outfits without claiming nothing is saved', async () => {
    setup(fakeOutfitStore([], 3));
    expect(
      await screen.findByText("3 saved outfits couldn't be read and aren't shown."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nothing saved yet/)).toBeNull();
  });

  it('lists newest first', async () => {
    setup(
      fakeOutfitStore([
        makeOutfit({ id: 'old', name: 'Old', createdAt: '2026-09-01T10:00:00.000Z' }),
        makeOutfit({ id: 'new', name: 'New', createdAt: '2026-09-22T10:00:00.000Z' }),
      ]),
    );
    const list = await screen.findByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(within(items[0]!).getByRole('button', { name: 'New' })).toBeInTheDocument();
    expect(within(items[1]!).getByRole('button', { name: 'Old' })).toBeInTheDocument();
  });

  it('describes each card by its date and pieces', async () => {
    setup(fakeOutfitStore([makeOutfit()]));
    const open = await screen.findByRole('button', { name: 'Navy bottom' });
    // The year appears once the suite runs after 2026.
    expect(open).toHaveAccessibleDescription(/^Mon, Sep 21(, 2026)?\. .*Navy bottom/);
    expect(open.id).toBe('outfit-navy');
  });

  // An outfit saved with slots missing lists only what it has, in the strip
  // and in the description. White is light enough to need the hairline.
  it('describes only the pieces an outfit has', async () => {
    setup(
      fakeOutfitStore([
        makeOutfit({ pieces: { bottom: NAVY_BOTTOM.hex, top: parseHex('#f7f6f3') } }),
      ]),
    );
    const open = await screen.findByRole('button', { name: 'Navy bottom' });
    expect(open).toHaveAccessibleDescription(/\. White top, Navy bottom$/);
  });

  it('opens an outfit back into the suggestions screen', async () => {
    const outfit = makeOutfit();
    const user = setup(fakeOutfitStore([outfit]));
    await user.click(await screen.findByRole('button', { name: 'Navy bottom' }));
    expect(screen.getByText('at /suggest?slot=bottom&hex=%231f2a44')).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('picks').textContent ?? '')).toEqual(
      openOutfit(outfit).picks,
    );
  });

  it('fills a slot the outfit is missing when it opens', async () => {
    const user = setup(fakeOutfitStore([makeOutfit({ pieces: { bottom: NAVY_BOTTOM.hex } })]));
    await user.click(await screen.findByRole('button', { name: 'Navy bottom' }));
    const picks = JSON.parse(screen.getByTestId('picks').textContent ?? '') as object;
    expect(Object.keys(picks).sort()).toEqual(['accessory', 'outerwear', 'shoes', 'top']);
  });

  it('deletes an outfit and offers Undo with focus', async () => {
    const store = fakeOutfitStore([makeOutfit()]);
    const user = setup(store);
    await user.click(await screen.findByRole('button', { name: 'Delete Navy bottom' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent('Deleted Navy bottom [focus]'),
    );
    expect(store.contents()).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Navy bottom' })).toBeNull();
  });

  it('says so when a delete fails, and keeps the card', async () => {
    const store = fakeOutfitStore([makeOutfit()]);
    store.fail.remove = true;
    const user = setup(store);
    await user.click(await screen.findByRole('button', { name: 'Delete Navy bottom' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't delete this outfit."),
    );
    expect(screen.getByRole('button', { name: 'Navy bottom' })).toBeInTheDocument();
  });
});
