import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { FieldCapture, FieldGarment } from '../../../model/field';
import { parseHex } from '../../../model/hex';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import type { FieldStore } from '../../../storage/port';
import { FieldList } from './FieldList';
import { fakeFieldStore } from './fieldStore.testing';
import { FieldStoreContext } from './FieldStoreContext';

const garment = (id: string, label: string, createdAt: string, ...hexes: string[]) =>
  ({ id, label, truth: hexes.map(parseHex), createdAt }) satisfies FieldGarment;

const capture = (id: string, garmentId: string | null, light: FieldCapture['light'] = 'daylight') =>
  ({
    id,
    source: garmentId ? 'kit' : 'flow',
    garmentId,
    settled: null,
    light,
    lowLight: false,
    width: 1,
    height: 1,
    takenAt: '2026-10-05T10:00:00.000Z',
    build: 'test',
  }) satisfies FieldCapture;

const PIXELS = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) };

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

function setup(store: FieldStore = fakeFieldStore()) {
  render(
    <FieldStoreContext value={store}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/dev/field']}>
          <Routes>
            <Route path="/dev/field" element={<FieldList />} />
            <Route path="/dev/field/new" element={<p>add screen</p>} />
          </Routes>
        </MemoryRouter>
        <Toast />
      </SessionProvider>
    </FieldStoreContext>,
  );
  return userEvent.setup();
}

describe('FieldList', () => {
  it('says there are no garments', async () => {
    setup();
    expect(await screen.findByText('No garments yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add garment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('lists garments newest first with their capture counts', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    await store.saveGarment(
      garment('g2', 'Striped scarf', '2026-10-03T10:00:00.000Z', '#a83232', '#f2ead8'),
    );
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    await store.saveCapture(capture('c2', 'g2'), PIXELS);
    await store.saveCapture(capture('c3', 'g2'), PIXELS);
    setup(store);

    const links = await screen.findAllByRole('link', { name: /coat|scarf/ });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/dev/field/garment?id=g2',
      '/dev/field/garment?id=g1',
    ]);
    expect(within(links[0]!).getByText('Striped scarf')).toBeInTheDocument();
    expect(within(links[0]!).getByText('2 captures')).toBeInTheDocument();
    expect(within(links[1]!).getByText('Navy coat')).toBeInTheDocument();
    expect(within(links[1]!).getByText('1 capture')).toBeInTheDocument();
    expect(screen.queryByText('No garments yet.')).not.toBeInTheDocument();
  });

  it('shows the store failure', async () => {
    setup(fakeFieldStore({ failing: true }));
    expect(await screen.findByText('The field store could not be opened.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add garment' })).not.toBeInTheDocument();
    expect(screen.queryByText('No garments yet.')).not.toBeInTheDocument();
  });

  it('renders nothing while the store loads', async () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Field recorder' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add garment' })).not.toBeInTheDocument();
    expect(screen.queryByText('No garments yet.')).not.toBeInTheDocument();
    // And then something, once it answers.
    expect(await screen.findByText('No garments yet.')).toBeInTheDocument();
  });

  it('lists the captures from normal use that have no garment', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    await store.saveCapture(capture('c1', 'g1', 'lamp'), PIXELS);
    await store.saveCapture(capture('c2', null, 'dim'), PIXELS);
    setup(store);

    const heading = await screen.findByRole('heading', { level: 2, name: 'From normal use' });
    const section = heading.closest('section')!;
    expect(within(section).getAllByRole('listitem')).toHaveLength(1);
    expect(within(section).getByText(/^Dim/)).toBeInTheDocument();
  });

  it('links a capture from normal use to a garment', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    await store.saveGarment(garment('g2', 'Red scarf', '2026-10-02T10:00:00.000Z', '#a83232'));
    await store.saveCapture(
      { ...capture('c1', null, 'dim'), settled: parseHex('#1f2a44') },
      PIXELS,
    );
    const user = setup(store);

    const heading = await screen.findByRole('heading', { level: 2, name: 'From normal use' });
    const section = heading.closest('section')!;
    // The settled color, by name as well as as a block.
    expect(within(section).getByText('Navy')).toBeInTheDocument();
    expect(within(section).getByRole('img', { name: 'Your photo' })).toBeInTheDocument();
    await user.click(within(section).getByRole('button', { name: 'Link to a garment' }));

    const sheet = screen.getByRole('dialog', { name: 'Link to a garment' });
    await user.click(within(sheet).getByRole('button', { name: 'Navy coat' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'From normal use' })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /coat|scarf/ });
    expect(within(links[1]!).getByText('1 capture')).toBeInTheDocument();
    const listed = await store.listCaptures();
    expect(listed.ok && listed.value[0]!.garmentId).toBe('g1');
  });

  it('toasts when linking fails and keeps the capture waiting', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    await store.saveCapture(capture('c1', null, 'dim'), PIXELS);
    store.linkCapture = () => Promise.resolve({ ok: false, reason: 'test' });
    const user = setup(store);

    await user.click(await screen.findByRole('button', { name: 'Link to a garment' }));
    await user.click(screen.getByRole('button', { name: 'Navy coat' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't link this capture."),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'From normal use' })).toBeInTheDocument();
  });

  it('offers no garments to link to before there are any', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', null, 'dim'), PIXELS);
    const user = setup(store);

    await user.click(await screen.findByRole('button', { name: 'Link to a garment' }));
    const sheet = screen.getByRole('dialog', { name: 'Link to a garment' });
    expect(within(sheet).getByText('No garments yet.')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('links once when a garment is tapped twice', async () => {
    const inner = fakeFieldStore();
    await inner.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    await inner.saveCapture(capture('c1', null, 'dim'), PIXELS);
    // Holds the link open until released, so the second tap lands mid-link.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let links = 0;
    const store: FieldStore = {
      ...inner,
      linkCapture: async (id, garmentId) => {
        links += 1;
        await held;
        return inner.linkCapture(id, garmentId);
      },
    };
    const user = setup(store);

    await user.click(await screen.findByRole('button', { name: 'Link to a garment' }));
    await user.click(screen.getByRole('button', { name: 'Navy coat' }));
    await user.click(screen.getByRole('button', { name: 'Navy coat' }));
    release();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(links).toBe(1);
  });

  it('lists a waiting capture whose frame cannot be read', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', null, 'dim'), PIXELS);
    store.readPixels = () => Promise.resolve({ ok: false, reason: 'test' });
    setup(store);

    expect(await screen.findByRole('button', { name: 'Link to a garment' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Your photo' })).not.toBeInTheDocument();
  });

  it('leaves out the normal-use section when there is nothing in it', async () => {
    setup();
    await screen.findByText('No garments yet.');
    expect(screen.queryByRole('heading', { name: 'From normal use' })).not.toBeInTheDocument();
  });

  it('opens the add screen', async () => {
    const user = setup();
    await user.click(await screen.findByRole('button', { name: 'Add garment' }));
    expect(screen.getByText('add screen')).toBeInTheDocument();
  });
});
