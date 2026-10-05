import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import { fakeSharePort, type FakeSharePort } from '../share/fakeShare.testing';
import { shareLink } from '../share/link';
import { ShareContext } from '../share/ShareContext';
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

function setup(store: OutfitStore, port: FakeSharePort = fakeSharePort()) {
  render(
    <ShareContext value={port}>
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
      </MemoryRouter>
    </ShareContext>,
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

// The screen's parent in the flow, fixed whatever route led here.
describe('Saved back arrow', () => {
  it('goes back to Start with a garment', async () => {
    setup(fakeOutfitStore());
    expect(
      await screen.findByRole('link', { name: 'Back to Start with a garment' }),
    ).toHaveAttribute('href', '/');
  });
});

/**
 * A stand-in IntersectionObserver, which jsdom lacks. `show` reports an
 * element as on screen to whichever observer watches it.
 */
function watchVisibility() {
  const watched = new Map<Element, IntersectionObserverCallback>();
  class FakeObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(element: Element) {
      watched.set(element, this.callback);
    }
    disconnect() {}
    unobserve() {}
  }
  const original = Reflect.get(window, 'IntersectionObserver') as unknown;
  Reflect.set(window, 'IntersectionObserver', FakeObserver);
  return {
    show(element: Element) {
      const callback = watched.get(element);
      callback?.(
        [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    },
    restore() {
      Reflect.set(window, 'IntersectionObserver', original);
    },
  };
}

describe('Saved: sharing', () => {
  const NAVY = makeOutfit();
  const MUSTARD = makeOutfit({
    id: 'mustard',
    name: 'Mustard top',
    baseSlot: 'top',
    pieces: { top: parseHex('#c39a3a'), bottom: parseHex('#1f2a44') },
  });

  it('offers to share each saved outfit by name', async () => {
    setup(fakeOutfitStore([NAVY, MUSTARD]));

    expect(await screen.findByRole('button', { name: 'Share Navy bottom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share Mustard top' })).toBeInTheDocument();
  });

  it('paints nothing for a card that is not on screen', async () => {
    const port = fakeSharePort();
    const screenWatch = watchVisibility();
    setup(fakeOutfitStore([NAVY, MUSTARD]), port);
    await screen.findByRole('button', { name: 'Share Navy bottom' });
    await act(async () => {});

    expect(port.calls.render).toHaveLength(0);
    screenWatch.restore();
  });

  // The picture has to be ready before the tap: Safari refuses a share that
  // waited for it. A card scrolled into view paints its own.
  it('paints a card as it comes on screen', async () => {
    const port = fakeSharePort();
    const screenWatch = watchVisibility();
    setup(fakeOutfitStore([NAVY, MUSTARD]), port);
    const share = await screen.findByRole('button', { name: 'Share Mustard top' });

    act(() => screenWatch.show(share.closest('li')!));

    await waitFor(() => expect(port.calls.render).toHaveLength(1));
    expect(port.calls.render[0]).toContainEqual(
      expect.objectContaining({ kind: 'block', color: '#c39a3a' }),
    );
    screenWatch.restore();
  });

  it('paints the outfit whose Share is touched, and shares it', async () => {
    const port = fakeSharePort();
    setup(fakeOutfitStore([NAVY, MUSTARD]), port);
    const share = await screen.findByRole('button', { name: 'Share Mustard top' });

    fireEvent.pointerDown(share);
    await waitFor(() => expect(port.calls.render).toHaveLength(1));
    fireEvent.click(share);

    await waitFor(() => expect(port.calls.share).toHaveLength(1));
    expect(port.calls.render).toHaveLength(1);
    const link = shareLink(window.location.origin, { pieces: MUSTARD.pieces, baseSlot: 'top' });
    expect(port.calls.share[0]!.text!.endsWith(link)).toBe(true);
  });

  it('paints on keyboard focus too', async () => {
    const port = fakeSharePort();
    setup(fakeOutfitStore([NAVY]), port);

    fireEvent.focus(await screen.findByRole('button', { name: 'Share Navy bottom' }));

    await waitFor(() => expect(port.calls.render).toHaveLength(1));
  });

  it('ignores a render that finishes after the card is gone', async () => {
    let finish: (file: File | null) => void = () => undefined;
    const port = fakeSharePort({
      render: () => new Promise<File | null>((resolve) => (finish = resolve)),
    });
    const user = setup(fakeOutfitStore([NAVY]), port);
    const share = await screen.findByRole('button', { name: 'Share Navy bottom' });

    fireEvent.pointerDown(share);
    fireEvent.click(share);
    await user.click(screen.getByRole('button', { name: 'Delete Navy bottom' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Share Navy bottom' })).toBeNull(),
    );
    await act(() => {
      finish(new File([''], 'huemi-outfit.png', { type: 'image/png' }));
      return Promise.resolve();
    });

    expect(port.calls.share).toHaveLength(0);
    expect(screen.getByTestId('toast')).not.toHaveTextContent("Couldn't share");
  });
});
