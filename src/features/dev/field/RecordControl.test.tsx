import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Frame } from '../../../model/frame';
import { parseHex, type Hex } from '../../../model/hex';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import type { FieldStore } from '../../../storage/port';
import { fakeFieldStore } from './fieldStore.testing';
import { FieldStoreContext } from './FieldStoreContext';
import { persistFieldSet } from './persist';
import { RecordControl } from './RecordControl';

// Asks once a page session, so the real one would answer only the first test.
vi.mock('./persist', () => ({ persistFieldSet: vi.fn() }));

const FRAME: Frame = {
  pixels: { width: 2, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]) },
  source: 'camera',
};
const NAVY = parseHex('#1f2a44');

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

// Stands in for the confirm screen: hands out `onSettle` and settles on demand.
function setup(options: { store?: FieldStore; lowLight?: boolean | null; frame?: Frame } = {}) {
  const store = options.store ?? fakeFieldStore();
  const listeners = new Set<(hex: Hex) => void>();
  const onSettle = (listener: (hex: Hex) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const view = render(
    <SessionProvider>
      <FieldStoreContext value={store}>
        <RecordControl
          frame={options.frame ?? FRAME}
          lowLight={options.lowLight === undefined ? false : options.lowLight}
          onSettle={onSettle}
        />
      </FieldStoreContext>
      <Toast />
    </SessionProvider>,
  );
  const settle = (hex: Hex) =>
    act(() => {
      for (const listener of listeners) listener(hex);
    });
  return { store, settle, listeners, view, user: userEvent.setup() };
}

async function captures(store: FieldStore) {
  const listed = await store.listCaptures();
  if (!listed.ok) throw new Error('the store failed');
  return listed.value;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(persistFieldSet).mockClear();
});

// Turns Record on and picks the light, the two taps before anything records.
async function turnOn(user: ReturnType<typeof userEvent.setup>, light = 'Lamp') {
  await user.click(screen.getByRole('button', { name: 'Record' }));
  await user.click(screen.getByRole('button', { name: light }));
}

describe('RecordControl', () => {
  it('records nothing while off', () => {
    const store = fakeFieldStore();
    const save = vi.spyOn(store, 'saveCapture');
    const { settle, listeners } = setup({ store });
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'Light' })).not.toBeInTheDocument();
    expect(listeners.size).toBe(0);
    settle(NAVY);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId('toast')).toHaveTextContent('');
  });

  it('records a flow capture on settle while on', async () => {
    const { store, settle, user } = setup();
    await turnOn(user);
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lamp' })).toHaveAttribute('aria-pressed', 'true');
    settle(NAVY);

    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('Capture recorded.'));
    const [capture, ...rest] = await captures(store);
    expect(rest).toEqual([]);
    expect(capture).toMatchObject({
      source: 'flow',
      garmentId: null,
      settled: NAVY,
      light: 'lamp',
      lowLight: false,
      width: 2,
      height: 1,
      build: 'unknown',
    });
    const pixels = await store.readPixels(capture!.id);
    expect(pixels.ok && [...pixels.value.data]).toEqual([...FRAME.pixels.data]);
    expect(persistFieldSet).toHaveBeenCalled();
  });

  // A guessed light would mislabel every capture until someone noticed.
  it('asks for the light before it records anything', async () => {
    const store = fakeFieldStore();
    const save = vi.spyOn(store, 'saveCapture');
    const { settle, listeners, user } = setup({ store });
    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Choose the light to record.')).toBeInTheDocument();
    const chips = screen.getByRole('group', { name: 'Light' });
    for (const chip of within(chips).getAllByRole('button')) {
      expect(chip).toHaveAttribute('aria-pressed', 'false');
    }
    expect(listeners.size).toBe(0);
    settle(NAVY);
    expect(save).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Dim' }));
    expect(screen.queryByText('Choose the light to record.')).not.toBeInTheDocument();
    expect(listeners.size).toBe(1);
  });

  it('carries null low light for an uploaded photo', async () => {
    const { store, settle, user } = setup({
      lowLight: null,
      frame: { ...FRAME, source: 'photo' },
    });
    await turnOn(user);
    settle(NAVY);
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('Capture recorded.'));
    const [capture] = await captures(store);
    expect(capture!.lowLight).toBeNull();
  });

  it('remembers being on, and its light for this session only', async () => {
    const first = setup();
    await turnOn(first.user, 'Dim');
    first.view.unmount();
    expect(JSON.parse(localStorage.getItem('huemi.field.recording')!)).toEqual({ on: true });
    expect(sessionStorage.getItem('huemi.field.recording.light')).toBe('dim');

    // Later in the same session: on, in the same light, and listening.
    const second = setup();
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dim' })).toHaveAttribute('aria-pressed', 'true');
    expect(second.listeners.size).toBe(1);
    second.view.unmount();

    // A new session is likely a new place, so the light is asked again.
    sessionStorage.clear();
    const third = setup();
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Choose the light to record.')).toBeInTheDocument();
    expect(third.listeners.size).toBe(0);

    // And off again sticks too.
    await third.user.click(screen.getByRole('button', { name: 'Record' }));
    expect(JSON.parse(localStorage.getItem('huemi.field.recording')!)).toEqual({ on: false });
    expect(screen.queryByRole('group', { name: 'Light' })).not.toBeInTheDocument();
  });

  it('starts off on anything it cannot read back', () => {
    localStorage.setItem('huemi.field.recording', '{"on":true,"light":"moon"');
    setup();
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('asks again for a light it does not know', () => {
    localStorage.setItem('huemi.field.recording', JSON.stringify({ on: true }));
    sessionStorage.setItem('huemi.field.recording.light', 'moon');
    const { listeners } = setup();
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Choose the light to record.')).toBeInTheDocument();
    expect(listeners.size).toBe(0);
  });

  it('keeps working when storage throws', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    try {
      const { user, listeners } = setup();
      await turnOn(user);
      expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(listeners.size).toBe(1);
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('toasts when recording fails', async () => {
    const { settle, user } = setup({ store: fakeFieldStore({ failing: true }) });
    await turnOn(user);
    settle(NAVY);
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't record this capture."),
    );
  });

  // A throw on the way to the store, from an id generator say, must not reach
  // the confirm screen's click handler.
  it('toasts when the save throws', async () => {
    const store = fakeFieldStore();
    vi.spyOn(store, 'saveCapture').mockImplementation(() => {
      throw new Error('no ids here');
    });
    const { settle, user } = setup({ store });
    await turnOn(user);
    settle(NAVY);
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't record this capture."),
    );
  });
});
