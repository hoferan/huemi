import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { blockLabel } from '../../color/palette';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { OutfitsProvider } from '../saved/OutfitsProvider';
import { outfitName } from '../saved/outfitName';
import { fakeOutfitStore, makeOutfit, type FakeOutfitStore } from '../saved/testing';
import { Shared } from './Shared';

const MUSTARD = parseHex('#c39a3a');
const NAVY = parseHex('#1f2a44');
const TAN = parseHex('#c9a57e');
const LINK = '/shared?top=c39a3a&bottom=1f2a44&shoes=c9a57e&base=top';

function Where() {
  const { pathname } = useLocation();
  return <p>{`at ${pathname}`}</p>;
}

/** The toast is rendered by the shell, which a feature test may not import. */
function ToastText() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

async function at(url: string, store: FakeOutfitStore = fakeOutfitStore()) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <InitialLocationContext value={true}>
        <SessionProvider>
          <OutfitsProvider store={store}>
            <Announcer>
              <Routes>
                <Route path="/shared" element={<Shared />} />
                <Route path="/" element={<Where />} />
              </Routes>
              <ToastText />
            </Announcer>
          </OutfitsProvider>
        </SessionProvider>
      </InitialLocationContext>
    </MemoryRouter>,
  );
  // The provider's first load, before any assertion.
  await act(async () => {});
  return {
    store,
    save: () => screen.getByRole('button', { name: /^(Save this outfit|Saved)$/ }),
    toast: () => screen.getByTestId('toast'),
  };
}

describe('Shared', () => {
  it('shows every piece as sent, head to toe', async () => {
    await at(LINK);

    expect(
      screen.getByRole('heading', { level: 1, name: 'An outfit for you' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual([
      blockLabel('top', MUSTARD),
      blockLabel('bottom', NAVY),
      blockLabel('shoes', TAN),
    ]);
  });

  it('marks the base and offers no controls on the blocks', async () => {
    await at(LINK);

    const top = screen.getByRole('group', { name: blockLabel('top', MUSTARD) });
    expect(within(top).getByText('Base')).toBeInTheDocument();
    for (const group of screen.getAllByRole('group')) {
      expect(within(group).queryAllByRole('button')).toHaveLength(0);
    }
  });

  it('saves the outfit with its base', async () => {
    const { store, save, toast } = await at(LINK);

    fireEvent.click(save());

    await waitFor(() => expect(store.contents()).toHaveLength(1));
    expect(store.contents()[0]).toMatchObject({
      baseSlot: 'top',
      pieces: { top: MUSTARD, bottom: NAVY, shoes: TAN },
      name: outfitName({ slot: 'top', hex: MUSTARD }),
    });
    await waitFor(() => expect(toast()).toHaveTextContent('Saved'));
    expect(save()).toHaveTextContent('Saved');
  });

  it('saves a link without a base by its largest piece', async () => {
    const { store, save } = await at('/shared?top=c39a3a&shoes=c9a57e&outerwear=1f2a44');

    fireEvent.click(save());

    await waitFor(() => expect(store.contents()).toHaveLength(1));
    expect(store.contents()[0]).toMatchObject({
      baseSlot: 'outerwear',
      name: outfitName({ slot: 'outerwear', hex: NAVY }),
    });
  });

  it('reads Saved when this outfit is already saved', async () => {
    const saved = makeOutfit({
      id: 'old',
      baseSlot: 'top',
      pieces: { top: MUSTARD, bottom: NAVY, shoes: TAN },
    });
    const { store, save } = await at(LINK, fakeOutfitStore([saved]));

    expect(save()).toHaveTextContent('Saved');
    fireEvent.click(save());
    await act(async () => {});

    expect(store.contents()).toHaveLength(1);
  });

  it('saves once however fast it is tapped', async () => {
    const { store, save } = await at(LINK);

    fireEvent.click(save());
    fireEvent.click(save());

    await waitFor(() => expect(save()).toHaveTextContent('Saved'));
    expect(store.contents()).toHaveLength(1);
  });

  it('says so when the device cannot save', async () => {
    const store = fakeOutfitStore();
    store.fail.save = true;
    const { save, toast } = await at(LINK, store);

    fireEvent.click(save());

    await waitFor(() =>
      expect(toast()).toHaveTextContent("Couldn't save this outfit on this device."),
    );
    expect(save()).toHaveTextContent('Save this outfit');
  });

  it('starts the app from Try your own colors', async () => {
    await at(LINK);

    fireEvent.click(screen.getByRole('button', { name: 'Try your own colors' }));

    expect(screen.getByText('at /')).toBeInTheDocument();
  });

  it('sends a link it cannot read to the start screen', async () => {
    await at('/shared?top=zzz');

    expect(screen.getByText('at /')).toBeInTheDocument();
  });
});
