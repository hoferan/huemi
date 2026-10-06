import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldGarment } from '../../../model/field';
import type { Frame, Pixels } from '../../../model/frame';
import { parseHex } from '../../../model/hex';
import type { FieldStore, StorageResult } from '../../../storage/port';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import { Announcer } from '../../../ui/Announcer';
import { CameraContext } from '../../camera/CameraContext';
import { SAMPLE_INTERVAL_MS, type CameraPort, type CameraResult } from '../../camera/port';
import { CaptureGarment } from './CaptureGarment';
import { fakeFieldStore } from './fieldStore.testing';
import { FieldStoreContext } from './FieldStoreContext';
import { persistFieldSet } from './persist';

// The helper asks once a page session, so the real one would answer only the
// first test here. Its own test covers what it does with the browser.
vi.mock('./persist', () => ({ persistFieldSet: vi.fn() }));

function solid(value: number): Pixels {
  const data = new Uint8ClampedArray(16);
  for (let i = 0; i < 16; i += 4) data.set([value, value, value, 255], i);
  return { width: 2, height: 2, data };
}

const bright: Frame = { pixels: solid(200), source: 'camera' };
const dark: Frame = { pixels: solid(10), source: 'camera' };

const coat: FieldGarment = {
  id: 'g1',
  label: 'Navy coat',
  truth: [parseHex('#1f2a44')],
  createdAt: '2026-10-01T10:00:00.000Z',
};

function camera(frame: Frame = bright, attach = vi.fn<CameraPort['attach']>()): CameraPort {
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  return {
    open: vi.fn(() => Promise.resolve<CameraResult>({ ok: true, stream })),
    attach,
    readFrame: vi.fn(() => frame),
    readPhoto: vi.fn(() => Promise.resolve({ ok: true as const, frame })),
  };
}

// Lets the sampler see a dark frame for long enough to raise the warning.
async function warnLowLight(attach: CameraPort['attach']) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  await vi.waitFor(() => expect(attach).toHaveBeenCalled());
  act(() => {
    vi.advanceTimersByTime(SAMPLE_INTERVAL_MS * 2);
  });
  // The hand-entry link appears with the warning.
  await screen.findByRole('link', { name: 'Back to the garment' });
}

beforeEach(() => {
  vi.mocked(persistFieldSet).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

async function setup(options: { store?: FieldStore; url?: string; port?: CameraPort } = {}) {
  const store = options.store ?? fakeFieldStore();
  await store.saveGarment(coat);
  render(
    <FieldStoreContext value={store}>
      <CameraContext value={options.port ?? camera()}>
        <MemoryRouter initialEntries={[options.url ?? '/dev/field/capture?id=g1&light=lamp']}>
          <Announcer>
            <SessionProvider>
              <Routes>
                <Route path="/dev/field/capture" element={<CaptureGarment />} />
                <Route path="*" element={<Where />} />
              </Routes>
              <Toast />
            </SessionProvider>
          </Announcer>
        </MemoryRouter>
      </CameraContext>
    </FieldStoreContext>,
  );
  // Lets the garment load settle inside act.
  await act(async () => {});
  return { user: userEvent.setup(), store };
}

function value<T>(result: StorageResult<T>): T {
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('CaptureGarment', () => {
  it('saves a kit capture with the light and low light', async () => {
    const attach = vi.fn<CameraPort['attach']>();
    const port = camera(dark, attach);
    const { user, store } = await setup({ port });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Capture Navy coat' }),
    ).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Take photo' });
    await warnLowLight(attach);
    await user.click(screen.getByRole('button', { name: 'Take photo' }));
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('Captured: Lamp.'));
    const [saved] = value(await store.listCaptures());
    expect(saved).toMatchObject({
      source: 'kit',
      garmentId: 'g1',
      settled: null,
      light: 'lamp',
      lowLight: true,
      width: 2,
      height: 2,
    });
    expect(saved!.id).not.toBe('');
    expect(saved!.build).not.toBe('');
    expect(Number.isNaN(Date.parse(saved!.takenAt))).toBe(false);
    expect(value(await store.readPixels(saved!.id))).toEqual(dark.pixels);
  });

  it('asks the browser to keep the set when it saves', async () => {
    const { user, store } = await setup();
    expect(persistFieldSet).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Take photo' }));
    await waitFor(async () => expect(value(await store.listCaptures())).toHaveLength(1));
    expect(persistFieldSet).toHaveBeenCalled();
  });

  it('stays ready for the next capture', async () => {
    const { user, store } = await setup();
    await user.click(await screen.findByRole('button', { name: 'Take photo' }));
    await waitFor(async () => expect(value(await store.listCaptures())).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Take photo' }));
    await waitFor(async () => expect(value(await store.listCaptures())).toHaveLength(2));
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('offers the way back to the garment', async () => {
    const attach = vi.fn<CameraPort['attach']>();
    const port = camera(dark, attach);
    await setup({ port });
    await screen.findByRole('button', { name: 'Take photo' });
    await warnLowLight(attach);
    expect(await screen.findByRole('link', { name: 'Back to the garment' })).toHaveAttribute(
      'href',
      '/dev/field/garment?id=g1',
    );
  });

  it('redirects an unknown garment', async () => {
    await setup({ url: '/dev/field/capture?id=nope&light=lamp' });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field$/));
  });

  it('redirects an unknown light', async () => {
    await setup({ url: '/dev/field/capture?id=g1&light=moon' });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field$/));
  });

  it('redirects a missing light', async () => {
    await setup({ url: '/dev/field/capture?id=g1' });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field$/));
  });

  it('toasts when the save fails', async () => {
    const failing: FieldStore = {
      ...fakeFieldStore(),
      saveCapture: () => Promise.resolve({ ok: false, reason: 'quota' }),
    };
    const { user } = await setup({ store: failing });
    await user.click(await screen.findByRole('button', { name: 'Take photo' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't record this capture."),
    );
  });

  it('shows the store failure', async () => {
    await setup({ store: fakeFieldStore({ failing: true }) });
    expect(await screen.findByText('The field store could not be opened.')).toBeInTheDocument();
  });
});
