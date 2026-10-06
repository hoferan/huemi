import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { FieldCapture, FieldGarment } from '../../../model/field';
import { parseHex } from '../../../model/hex';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import type { FieldStore, StorageResult } from '../../../storage/port';
import { fakeSharePort } from '../../share/fakeShare.testing';
import type { SharePort } from '../../share/port';
import { ShareContext } from '../../share/ShareContext';
import { FieldList } from './FieldList';
import { fakeFieldStore } from './fieldStore.testing';
import { FieldStoreContext } from './FieldStoreContext';

// jsdom has no CompressionStream to run the real one against, and joining the
// chunks keeps the bytes readable here. e2e/features/field.feature unzips a
// real export.
vi.mock('./gzip', () => ({
  gzipChunks: async (chunks: AsyncIterable<Uint8Array>) => {
    const parts: number[] = [];
    for await (const chunk of chunks) parts.push(...chunk);
    return Uint8Array.from(parts);
  },
}));

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

function setup(store: FieldStore = fakeFieldStore(), share: SharePort = fakeSharePort()) {
  render(
    <FieldStoreContext value={store}>
      <ShareContext value={share}>
        <SessionProvider>
          <MemoryRouter initialEntries={['/dev/field']}>
            <Routes>
              <Route path="/dev/field" element={<FieldList />} />
              <Route path="/dev/field/new" element={<p>add screen</p>} />
            </Routes>
          </MemoryRouter>
          <Toast />
        </SessionProvider>
      </ShareContext>
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

  it('deletes a capture from normal use without linking it', async () => {
    const store = fakeFieldStore();
    await store.saveCapture({ ...capture('c1', null, 'dim'), width: 512, height: 384 }, PIXELS);
    await store.saveCapture(
      { ...capture('c2', null, 'lamp'), takenAt: '2026-10-06T10:00:00.000Z' },
      PIXELS,
    );
    const user = setup(store);

    const heading = await screen.findByRole('heading', { level: 2, name: 'From normal use' });
    const section = heading.closest('section')!;
    const dim = within(section)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText(/^Dim/))!;
    await user.click(within(dim).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(within(section).getAllByRole('listitem')).toHaveLength(1));
    expect(within(section).getByText(/^Lamp/)).toBeInTheDocument();
    expect(screen.getByText('1 capture, about 0.0 MB')).toBeInTheDocument();
    const listed = await store.listCaptures();
    expect(listed.ok && listed.value.map((c) => c.id)).toEqual(['c2']);
    expect((await store.readPixels('c1')).ok).toBe(false);
    expect(screen.getByTestId('toast')).toHaveTextContent('');
  });

  it('drops the section once its last capture is deleted', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', null, 'dim'), PIXELS);
    const user = setup(store);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'From normal use' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('toasts when a capture from normal use cannot be deleted, and keeps it', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', null, 'dim'), PIXELS);
    store.deleteCapture = () => Promise.resolve({ ok: false, reason: 'test' });
    const user = setup(store);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't delete this capture."),
    );
    expect(screen.getByRole('heading', { name: 'From normal use' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('deletes once when Delete is tapped twice', async () => {
    const inner = fakeFieldStore();
    await inner.saveCapture(capture('c1', null, 'dim'), PIXELS);
    // Holds the delete until released, so the second tap lands mid-delete.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let deletes = 0;
    const store: FieldStore = {
      ...inner,
      deleteCapture: async (id) => {
        deletes += 1;
        await held;
        return inner.deleteCapture(id);
      },
    };
    const user = setup(store);

    const remove = await screen.findByRole('button', { name: 'Delete' });
    await user.click(remove);
    await user.click(remove);
    release();
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'From normal use' })).not.toBeInTheDocument(),
    );
    expect(deletes).toBe(1);
    expect(screen.getByTestId('toast')).toHaveTextContent('');
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

  it('shows the count and size', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    // 512 by 384 is 786,432 bytes a frame, so two come to about 1.6 MB.
    await store.saveCapture({ ...capture('c1', 'g1'), width: 512, height: 384 }, PIXELS);
    await store.saveCapture({ ...capture('c2', null), width: 512, height: 384 }, PIXELS);
    setup(store);

    expect(await screen.findByText('2 captures, about 1.6 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('keeps Export disabled with no captures', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    setup(store);

    expect(await screen.findByText('0 captures, about 0.0 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('downloads in one step without a share sheet', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    const share = fakeSharePort({ canShareFiles: () => false });
    const user = setup(store, share);

    expect(await screen.findByText('1 capture, about 0.0 MB')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent('Field set exported.'),
    );
    expect(share.calls.download.map((file) => file.type)).toEqual(['application/gzip']);
    expect(share.calls.share).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Share the export' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('shows Preparing export… while building', async () => {
    const inner = fakeFieldStore();
    await inner.saveCapture(capture('c1', 'g1'), PIXELS);
    // Holds the frame read until released, so the build stays in progress.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store: FieldStore = {
      ...inner,
      readPixels: async (id) => {
        await held;
        return inner.readPixels(id);
      },
    };
    const share = fakeSharePort();
    const user = setup(store, share);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    expect(screen.getByRole('button', { name: 'Preparing export…' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    release();
    const send = await screen.findByRole('button', { name: 'Share the export' });
    expect(send).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    // The sheet opens only from the second tap.
    expect(share.calls.share).toEqual([]);
  });

  it('shares inside the click with no await before it', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    // Set as a click starts and cleared once its handlers have run, so a share
    // started after an await finds it false, as Safari would.
    let inClick = false;
    const mark = () => {
      inClick = true;
      queueMicrotask(() => {
        inClick = false;
      });
    };
    document.addEventListener('click', mark, { capture: true });
    const started: boolean[] = [];
    const share = fakeSharePort({
      share: () => {
        started.push(inClick);
        return Promise.resolve('shared');
      },
    });
    const user = setup(store, share);

    try {
      await user.click(await screen.findByRole('button', { name: 'Export' }));
      await user.click(await screen.findByRole('button', { name: 'Share the export' }));
      expect(started).toEqual([true]);
    } finally {
      document.removeEventListener('click', mark, { capture: true });
    }
  });

  it('says so after a share and drops the prepared export', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    const share = fakeSharePort();
    const user = setup(store, share);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('button', { name: 'Share the export' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent('Field set exported.'),
    );
    expect(share.calls.share.map(({ title }) => title)).toEqual(['huemi field set']);
    expect(screen.queryByRole('button', { name: 'Share the export' })).not.toBeInTheDocument();
  });

  it('keeps the prepared export when the share sheet is closed', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    const share = fakeSharePort({ share: () => Promise.resolve('dismissed') });
    const user = setup(store, share);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    const send = await screen.findByRole('button', { name: 'Share the export' });
    await user.click(send);
    // A second share starts only once the first has its outcome.
    await user.click(send);
    await waitFor(() => expect(share.calls.share).toHaveLength(2));
    expect(share.calls.share[1]!.files).toEqual(share.calls.share[0]!.files);
    expect(screen.getByTestId('toast')).toHaveTextContent('');
  });

  it('says when sharing fails and keeps the prepared export', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    const share = fakeSharePort({ share: () => Promise.resolve('failed') });
    const user = setup(store, share);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('button', { name: 'Share the export' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't export the field set."),
    );
    expect(screen.getByRole('button', { name: 'Share the export' })).toBeInTheDocument();
  });

  it('says when the share throws', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    const share = fakeSharePort({ share: () => Promise.reject(new Error('test')) });
    const user = setup(store, share);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('button', { name: 'Share the export' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't export the field set."),
    );
  });

  it('shares once when tapped twice', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    // Holds the share sheet open until released, so the second tap lands while it is up.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const share = fakeSharePort({ share: () => held.then(() => 'shared' as const) });
    const user = setup(store, share);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    const send = await screen.findByRole('button', { name: 'Share the export' });
    await user.click(send);
    await user.click(send);
    release();
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent('Field set exported.'),
    );
    expect(share.calls.share).toHaveLength(1);
  });

  it('says when building fails', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    store.readPixels = () => Promise.resolve({ ok: false, reason: 'test' });
    const share = fakeSharePort();
    const user = setup(store, share);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't export the field set."),
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Share the export' })).not.toBeInTheDocument();
  });

  it('takes Export again after a build that throws', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', 'g1'), PIXELS);
    const user = setup(store);
    await screen.findByRole('button', { name: 'Export' });
    store.listGarments = () => Promise.reject(new Error('test'));

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't export the field set."),
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('drops the prepared export when the set changes', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', 'Navy coat', '2026-10-01T10:00:00.000Z', '#1f2a44'));
    await store.saveCapture(capture('c1', null, 'dim'), PIXELS);
    const user = setup(store);

    await user.click(await screen.findByRole('button', { name: 'Export' }));
    await screen.findByRole('button', { name: 'Share the export' });
    // Linking changes what the set holds, so the file built before it is stale.
    await user.click(screen.getByRole('button', { name: 'Link to a garment' }));
    await user.click(screen.getByRole('button', { name: 'Navy coat' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Share the export' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  describe('while an export prepares', () => {
    // Holds the export at its set id, which only the export asks for, so the
    // list loads as usual and the build waits until released.
    async function holdExport(setId: StorageResult<string>) {
      const inner = fakeFieldStore();
      await inner.saveCapture(capture('c1', null, 'dim'), PIXELS);
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const store: FieldStore = {
        ...inner,
        setId: async () => {
          await held;
          return setId;
        },
      };
      return { store, release: () => release() };
    }

    const captureButtons = () => [
      screen.getByRole('button', { name: 'Link to a garment' }),
      screen.getByRole('button', { name: 'Delete' }),
    ];

    it('keeps Delete and Link disabled while an export prepares', async () => {
      const { store, release } = await holdExport({ ok: true, value: 'set' });
      const user = setup(store);

      await user.click(await screen.findByRole('button', { name: 'Export' }));
      await screen.findByRole('button', { name: 'Preparing export…' });
      for (const button of captureButtons()) expect(button).toBeDisabled();
      release();
      await screen.findByRole('button', { name: 'Share the export' });
    });

    it('enables Delete and Link again once the export is ready', async () => {
      const { store, release } = await holdExport({ ok: true, value: 'set' });
      const user = setup(store);

      await user.click(await screen.findByRole('button', { name: 'Export' }));
      release();
      await screen.findByRole('button', { name: 'Share the export' });
      for (const button of captureButtons()) expect(button).toBeEnabled();
    });

    it('enables Delete and Link again after the export fails', async () => {
      const { store, release } = await holdExport({ ok: false, reason: 'test' });
      const user = setup(store);

      await user.click(await screen.findByRole('button', { name: 'Export' }));
      release();
      await waitFor(() =>
        expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't export the field set."),
      );
      expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
      for (const button of captureButtons()) expect(button).toBeEnabled();
    });
  });

  it('opens the add screen', async () => {
    const user = setup();
    await user.click(await screen.findByRole('button', { name: 'Add garment' }));
    expect(screen.getByText('add screen')).toBeInTheDocument();
  });
});
