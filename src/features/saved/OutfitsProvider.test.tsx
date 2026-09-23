import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OutfitsProvider } from './OutfitsProvider';
import { fakeOutfitStore, makeOutfit, type FakeOutfitStore } from './testing';
import { useOutfits } from './useOutfits';

function Probe() {
  const { state, reload, save, remove, restore } = useOutfits();
  const text =
    state.status === 'ready'
      ? `ready ${state.outfits.map((o) => o.id).join(',')} unreadable ${state.unreadable}`
      : state.status;
  return (
    <>
      <p>{text}</p>
      <button type="button" onClick={() => void reload()}>
        reload
      </button>
      <button
        type="button"
        onClick={() =>
          void save(makeOutfit({ id: 'new' })).then((ok) => (document.title = `${ok}`))
        }
      >
        save
      </button>
      <button
        type="button"
        onClick={() => void remove(['navy']).then((ok) => (document.title = `${ok}`))}
      >
        remove
      </button>
      <button
        type="button"
        onClick={() => void restore([makeOutfit()]).then((ok) => (document.title = `${ok}`))}
      >
        restore
      </button>
    </>
  );
}

function setup(store: FakeOutfitStore) {
  render(
    <OutfitsProvider store={store}>
      <Probe />
    </OutfitsProvider>,
  );
  return userEvent.setup();
}

describe('OutfitsProvider', () => {
  it('starts loading, then lists what is stored', async () => {
    setup(fakeOutfitStore([makeOutfit()], 1));
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('ready navy unreadable 1')).toBeInTheDocument();
  });

  it('reports a read that failed', async () => {
    const store = fakeOutfitStore();
    store.fail.list = true;
    setup(store);
    expect(await screen.findByText('error')).toBeInTheDocument();
  });

  it('reads again on reload', async () => {
    const store = fakeOutfitStore([makeOutfit()]);
    store.fail.list = true;
    const user = setup(store);
    await screen.findByText('error');
    store.fail.list = false;
    await user.click(screen.getByRole('button', { name: 'reload' }));
    expect(await screen.findByText('ready navy unreadable 0')).toBeInTheDocument();
  });

  it('saves and shows the new list', async () => {
    const store = fakeOutfitStore([makeOutfit()]);
    const user = setup(store);
    await screen.findByText(/^ready/);
    await user.click(screen.getByRole('button', { name: 'save' }));
    expect(await screen.findByText('ready navy,new unreadable 0')).toBeInTheDocument();
    expect(document.title).toBe('true');
  });

  it('removes and restores', async () => {
    const store = fakeOutfitStore([makeOutfit()]);
    const user = setup(store);
    await screen.findByText(/^ready/);
    await user.click(screen.getByRole('button', { name: 'remove' }));
    // Not 'ready  unreadable 0': Testing Library's default normalizer
    // collapses the rendered text's whitespace but not the search string, so
    // the double space the empty join leaves behind never matches literally.
    expect(await screen.findByText('ready unreadable 0')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'restore' }));
    expect(await screen.findByText('ready navy unreadable 0')).toBeInTheDocument();
  });

  it.each(['save', 'remove', 'restore'] as const)(
    'reports a %s that failed and keeps the list',
    async (name) => {
      const store = fakeOutfitStore([makeOutfit()]);
      store.fail.save = true;
      store.fail.remove = true;
      const user = setup(store);
      await screen.findByText(/^ready/);
      await user.click(screen.getByRole('button', { name }));
      await waitFor(() => expect(document.title).toBe('false'));
      expect(screen.getByText('ready navy unreadable 0')).toBeInTheDocument();
    },
  );

  // A read that lands after the provider has gone must not set state on it.
  it('ignores a read that lands after it unmounted', async () => {
    const { unmount } = render(
      <OutfitsProvider store={fakeOutfitStore([makeOutfit()])}>
        <Probe />
      </OutfitsProvider>,
    );
    unmount();
    await Promise.resolve();
    expect(screen.queryByText(/^ready/)).toBeNull();
  });

  it('refuses to render without a provider', () => {
    expect(() => render(<Probe />)).toThrow('useOutfits needs an OutfitsProvider above it');
  });
});
