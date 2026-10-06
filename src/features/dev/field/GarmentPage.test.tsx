import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { FieldCapture, FieldGarment } from '../../../model/field';
import { parseHex } from '../../../model/hex';
import type { FieldStore, StorageResult } from '../../../storage/port';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import { fakeFieldStore } from './fieldStore.testing';
import { FieldStoreContext } from './FieldStoreContext';
import { GarmentPage } from './GarmentPage';

const coat: FieldGarment = {
  id: 'g1',
  label: 'Navy coat',
  truth: [parseHex('#1f2a44')],
  createdAt: '2026-10-01T10:00:00.000Z',
};

const capture = (id: string, light: FieldCapture['light'], takenAt: string): FieldCapture => ({
  id,
  source: 'kit',
  garmentId: 'g1',
  settled: null,
  light,
  lowLight: false,
  width: 1,
  height: 1,
  takenAt,
  build: 'test',
});

const PIXELS = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) };

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

async function seeded() {
  const store = fakeFieldStore();
  await store.saveGarment(coat);
  await store.saveCapture(capture('c1', 'daylight', '2026-09-01T10:00:00.000Z'), PIXELS);
  await store.saveCapture(capture('c2', 'lamp', '2026-09-02T10:00:00.000Z'), PIXELS);
  return store;
}

function setup(store: FieldStore, url = '/dev/field/garment?id=g1') {
  render(
    <FieldStoreContext value={store}>
      <MemoryRouter initialEntries={['/dev/field', url]} initialIndex={1}>
        <SessionProvider>
          <Routes>
            <Route path="/dev/field/garment" element={<GarmentPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
          <Toast />
        </SessionProvider>
      </MemoryRouter>
    </FieldStoreContext>,
  );
  return userEvent.setup();
}

function value<T>(result: StorageResult<T>): T {
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('GarmentPage', () => {
  it('redirects an unknown garment to the list', async () => {
    setup(await seeded(), '/dev/field/garment?id=nope');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field$/));
  });

  it('redirects a missing id to the list', async () => {
    setup(await seeded(), '/dev/field/garment');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field$/));
  });

  it('shows the store failure', async () => {
    setup(fakeFieldStore({ failing: true }));
    expect(await screen.findByText('The field store could not be opened.')).toBeInTheDocument();
  });

  it('lists the captures newest first with their light and date', async () => {
    setup(await seeded());
    expect(await screen.findByRole('heading', { level: 1, name: 'Navy coat' })).toBeInTheDocument();
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Lamp');
    expect(items[1]).toHaveTextContent('Daylight');
    expect(within(items[0]!).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('keeps Capture disabled until a light is chosen', async () => {
    const user = setup(await seeded());
    const shoot = await screen.findByRole('button', { name: 'Capture' });
    expect(shoot).toBeDisabled();
    const dim = screen.getByRole('button', { name: 'Dim' });
    expect(dim).toHaveAttribute('aria-pressed', 'false');
    await user.click(dim);
    expect(dim).toHaveAttribute('aria-pressed', 'true');
    expect(shoot).toBeEnabled();
  });

  it('opens the capture with the chosen light', async () => {
    const user = setup(await seeded());
    await user.click(await screen.findByRole('button', { name: 'Lamp' }));
    await user.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/dev/field/capture?id=g1&light=lamp');
  });

  it('deletes one capture', async () => {
    const store = await seeded();
    const user = setup(store);
    const items = await screen.findAllByRole('listitem');
    await user.click(within(items[0]!).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(value(await store.listCaptures()).map((c) => c.id)).toEqual(['c1']);
  });

  it('deletes the garment after confirming', async () => {
    const store = await seeded();
    const user = setup(store);
    await user.click(await screen.findByRole('button', { name: 'Delete garment' }));
    const sheet = await screen.findByRole('dialog', {
      name: 'Delete Navy coat and its 2 captures?',
    });
    await user.click(within(sheet).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field$/));
    expect(value(await store.listGarments())).toEqual([]);
    expect(value(await store.listCaptures())).toEqual([]);
  });

  it('counts a single capture in the singular when deleting', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(coat);
    await store.saveCapture(capture('c1', 'daylight', '2026-09-01T10:00:00.000Z'), PIXELS);
    const user = setup(store);
    await user.click(await screen.findByRole('button', { name: 'Delete garment' }));
    expect(
      await screen.findByRole('dialog', { name: 'Delete Navy coat and its 1 capture?' }),
    ).toBeInTheDocument();
  });

  it('toasts when a capture cannot be deleted', async () => {
    const store = await seeded();
    const user = setup({
      ...store,
      deleteCapture: () => Promise.resolve({ ok: false, reason: 'x' }),
    });
    const items = await screen.findAllByRole('listitem');
    await user.click(within(items[0]!).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't delete this capture."),
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('toasts and stays when the garment cannot be deleted', async () => {
    const store = await seeded();
    const user = setup({
      ...store,
      deleteGarment: () => Promise.resolve({ ok: false, reason: 'x' }),
    });
    await user.click(await screen.findByRole('button', { name: 'Delete garment' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't delete this garment."),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Navy coat' })).toBeInTheDocument();
  });

  it('keeps the garment when the sheet is dismissed', async () => {
    const store = await seeded();
    const user = setup(store);
    await user.click(await screen.findByRole('button', { name: 'Delete garment' }));
    await user.click(await screen.findByRole('button', { name: 'Keep it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(value(await store.listGarments())).toHaveLength(1);
  });
});
