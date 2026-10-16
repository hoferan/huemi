import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hexToRgb, hslToHex, rgbToHsl } from '../../../color/convert';
import { withLightness } from '../../../color/oklab';
import { PALETTE } from '../../../color/palette';
import { colorsIn } from '../../../color/read';
import { NAVY, paint, RUST, solid, WHITE } from '../../../color/testing';
import type { FieldCapture } from '../../../model/field';
import type { Frame } from '../../../model/frame';
import type { FieldStore, StorageResult } from '../../../storage/port';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import { Announcer } from '../../../ui/Announcer';
import { CameraContext } from '../../camera/CameraContext';
import type { CameraPort, CameraResult } from '../../camera/port';
import { fakeSharePort } from '../../share/fakeShare.testing';
import { ShareContext } from '../../share/ShareContext';
import { fakeFieldStore } from '../field/fieldStore.testing';
import { FieldStoreContext } from '../field/FieldStoreContext';
import { persistFieldSet } from '../field/persist';
import { ReadingRun } from './ReadingRun';

// The helper asks once a page session, so the real one would answer only the
// first test here. Its own test covers what it does with the browser.
vi.mock('../field/persist', () => ({ persistFieldSet: vi.fn() }));

const plain: Frame = { pixels: solid(RUST, 40), source: 'camera' };
const striped: Frame = {
  pixels: paint(40, 40, (_, y) => (y % 10 < 6 ? NAVY : WHITE)),
  source: 'camera',
};
// What the run shows for each frame: the largest color the reader found.
const shownFor = (frame: Frame) => colorsIn(frame.pixels)[0]!.color;

function camera(
  frame: Frame = plain,
  open: () => Promise<CameraResult> = () =>
    Promise.resolve({
      ok: true,
      stream: { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream,
    }),
): CameraPort {
  return {
    open: vi.fn(open),
    attach: vi.fn(),
    readFrame: vi.fn(() => frame),
    readPhoto: vi.fn(() => Promise.resolve({ ok: true as const, frame })),
  };
}

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

function tree(store: FieldStore, port: CameraPort) {
  return (
    <FieldStoreContext value={store}>
      <ShareContext value={fakeSharePort()}>
        <CameraContext value={port}>
          <MemoryRouter initialEntries={['/dev/reading']}>
            <Announcer>
              <SessionProvider>
                <ReadingRun />
                <Toast />
              </SessionProvider>
            </Announcer>
          </MemoryRouter>
        </CameraContext>
      </ShareContext>
    </FieldStoreContext>
  );
}

function setup(options: { store?: FieldStore; port?: CameraPort } = {}) {
  const store = options.store ?? fakeFieldStore();
  const port = options.port ?? camera();
  const view = render(tree(store, port));
  return { user: userEvent.setup(), store, port, view };
}

type User = ReturnType<typeof userEvent.setup>;

async function start(user: User, length = '20') {
  await user.click(screen.getByRole('button', { name: length }));
  await user.click(screen.getByRole('button', { name: 'Lamp' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
}

async function shoot(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Take photo' }));
}

async function yes(user: User) {
  await shoot(user);
  await user.click(await screen.findByRole('button', { name: 'Yes' }));
  // Back on the camera once the save is in.
  await screen.findByRole('button', { name: 'Take photo' });
}

function value<T>(result: StorageResult<T>): T {
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

async function saved(store: FieldStore, n = 1): Promise<FieldCapture[]> {
  let captures: FieldCapture[] = [];
  await waitFor(async () => {
    captures = value(await store.listCaptures());
    expect(captures).toHaveLength(n);
  });
  return captures;
}

beforeEach(() => {
  vi.mocked(persistFieldSet).mockClear();
});

describe('ReadingRun', () => {
  it('asks for the length and the light first', () => {
    setup();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Check color reading' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Number of questions' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('saves a Yes as a right answer with the color it showed', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    const card = await screen.findByRole('group', { name: 'Is this its color?' });
    expect(within(card).getByRole('img', { name: 'Your photo' })).toBeInTheDocument();
    expect(persistFieldSet).not.toHaveBeenCalled();
    await user.click(within(card).getByRole('button', { name: 'Yes' }));
    const [capture] = await saved(store);
    expect(capture).toMatchObject({
      source: 'run',
      verdict: 'right',
      settled: shownFor(plain),
      light: 'lamp',
      garmentId: null,
      width: 40,
      height: 40,
    });
    expect(capture!.build).not.toBe('');
    expect(Number.isNaN(Date.parse(capture!.takenAt))).toBe(false);
    expect(value(await store.readPixels(capture!.id))).toEqual(plain.pixels);
    expect(persistFieldSet).toHaveBeenCalled();
    expect(await screen.findByText('2 of 20')).toBeInTheDocument();
  });

  it('saves a correction with the swatch picked and its lightness shift', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Which is closer?' })).toBeInTheDocument();
    expect(screen.getByText('Look at the garment, not the photo.')).toBeInTheDocument();
    const swatches = within(screen.getByRole('group', { name: 'Closer to one of these?' }));
    const neighbour = swatches.getAllByRole('button')[1]!;
    const picked = PALETTE.find(({ name }) => name === neighbour.textContent)!.hex;
    await user.click(neighbour);
    fireEvent.change(screen.getByRole('slider', { name: 'Lighter or darker' }), {
      target: { value: '0.05' },
    });
    await user.click(screen.getByRole('button', { name: 'Use this color' }));
    const [capture] = await saved(store);
    expect(capture).toMatchObject({ verdict: 'corrected', settled: withLightness(picked, 0.05) });
  });

  it('goes back to the vote when the correction is closed', async () => {
    const { user } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('group', { name: 'Is this its color?' })).toBeInTheDocument();
  });

  it('saves the color set on the sliders after None of these', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'None of these' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Match the garment' }),
    ).toBeInTheDocument();
    const [hue, saturation] = rgbToHsl(hexToRgb(shownFor(plain))).map(Math.round);
    expect(screen.getByRole('slider', { name: 'Hue' })).toHaveValue(String(hue));
    fireEvent.change(screen.getByRole('slider', { name: 'Lightness' }), {
      target: { value: '70' },
    });
    await user.click(screen.getByRole('button', { name: 'Use this color' }));
    const [capture] = await saved(store);
    expect(capture).toMatchObject({
      verdict: 'corrected',
      settled: hslToHex(hue!, saturation!, 70),
    });
  });

  it('skips from the sliders too', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'None of these' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    const [capture] = await saved(store);
    expect(capture).toMatchObject({ verdict: 'missed', settled: null });
  });

  it('saves nothing when the rejected reading is used unchanged', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Use this color' }));
    expect(screen.getByText('Pick a closer color, or skip.')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('heading', { level: 1, name: 'Which is closer?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use this color' })).toBeEnabled();
    expect(value(await store.listCaptures())).toEqual([]);
    // Choosing another swatch takes the hint away.
    const swatches = within(screen.getByRole('group', { name: 'Closer to one of these?' }));
    await user.click(swatches.getAllByRole('button')[1]!);
    expect(screen.queryByText('Pick a closer color, or skip.')).not.toBeInTheDocument();
  });

  it('goes back from the sliders to the swatches without saving', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'None of these' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Which is closer?' })).toBeInTheDocument();
    expect(value(await store.listCaptures())).toEqual([]);
  });

  it('saves nothing when the sliders are used without moving', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'None of these' }));
    await user.click(screen.getByRole('button', { name: 'Use this color' }));
    expect(screen.getByText('Pick a closer color, or skip.')).toHaveAttribute('role', 'status');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Match the garment' }),
    ).toBeInTheDocument();
    expect(value(await store.listCaptures())).toEqual([]);
    fireEvent.change(screen.getByRole('slider', { name: 'Hue' }), { target: { value: '200' } });
    expect(screen.queryByText('Pick a closer color, or skip.')).not.toBeInTheDocument();
  });

  it('takes the largest color as the correction of a reading that was not single', async () => {
    const { user, store } = setup({ port: camera(striped) });
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'Use this color' }));
    const [capture] = await saved(store);
    expect(capture).toMatchObject({ verdict: 'corrected', settled: shownFor(striped) });
  });

  it('saves a Skip as a miss with no color', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    const [capture] = await saved(store);
    expect(capture).toMatchObject({ source: 'run', verdict: 'missed', settled: null });
  });

  it('goes straight to the correction for a garment read as several colors', async () => {
    const { user } = setup({ port: camera(striped) });
    await start(user);
    await shoot(user);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Which is closer?' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Is this its color?' })).not.toBeInTheDocument();
    // With no vote to go back to, closing the panel leaves it be.
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Which is closer?' })).toBeInTheDocument();
  });

  it('takes back the last answer, deleting its capture', async () => {
    const { user, store } = setup();
    await start(user);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    await yes(user);
    await saved(store);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('group', { name: 'Is this its color?' })).toBeInTheDocument();
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
    expect(value(await store.listCaptures())).toEqual([]);
  });

  it('stays put when the undo cannot delete', async () => {
    const inner = fakeFieldStore();
    const store: FieldStore = {
      ...inner,
      deleteCapture: () => Promise.resolve({ ok: false, reason: 'test' }),
    };
    const { user } = setup({ store });
    await start(user);
    await yes(user);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't take that answer back."),
    );
    expect(screen.getByText('2 of 20')).toBeInTheDocument();
    expect(value(await store.listCaptures())).toHaveLength(1);
  });

  it('saves one capture for two quick Yes taps', async () => {
    const { user, store } = setup();
    await start(user);
    await shoot(user);
    const button = await screen.findByRole('button', { name: 'Yes' });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByRole('button', { name: 'Take photo' });
    await saved(store);
    expect(screen.getByText('2 of 20')).toBeInTheDocument();
  });

  it('stays on the vote when the save fails', async () => {
    const { user } = setup({ store: fakeFieldStore({ failing: true }) });
    await start(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'Yes' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't record this capture."),
    );
    expect(screen.getByRole('group', { name: 'Is this its color?' })).toBeInTheDocument();
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
  });

  it('shows the progress on the camera, with no photo to choose', async () => {
    const { user } = setup();
    await start(user);
    for (let n = 0; n < 3; n++) await yes(user);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Point at a plain garment' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4 of 20')).toBeInTheDocument();
    expect(screen.getByText('Lamp')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose a photo' })).not.toBeInTheDocument();
  });

  it('keeps the progress on a denied camera', async () => {
    const port = camera(plain, () => Promise.resolve({ ok: false, reason: 'denied' }));
    const { user } = setup({ port });
    await start(user);
    expect(
      await screen.findByRole('heading', { level: 2, name: "huemi can't see your camera" }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose a photo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /by hand/ })).not.toBeInTheDocument();
  });

  it('starts over after a remount, keeping what was saved', async () => {
    const { user, store, port, view } = setup();
    await start(user);
    await yes(user);
    view.unmount();
    render(tree(store, port));
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(value(await store.listCaptures())).toHaveLength(1);
  });

  // Twenty rounds through the camera take about three seconds here, too close
  // to the default five on a busy CI runner.
  it(
    'sums up the run with its misses, and takes back the last answer from there',
    { timeout: 15_000 },
    async () => {
      const { user, store } = setup();
      await start(user);
      for (let n = 0; n < 17; n++) await yes(user);
      // One correction to a neighbouring swatch, and two skips.
      await shoot(user);
      await user.click(await screen.findByRole('button', { name: 'No' }));
      const swatches = within(screen.getByRole('group', { name: 'Closer to one of these?' }));
      const neighbour = swatches.getAllByRole('button')[1]!;
      const named = neighbour.textContent;
      await user.click(neighbour);
      await user.click(screen.getByRole('button', { name: 'Use this color' }));
      for (let n = 0; n < 2; n++) {
        await shoot(user);
        await user.click(await screen.findByRole('button', { name: 'No' }));
        await user.click(screen.getByRole('button', { name: 'Skip' }));
      }
      expect(await screen.findByText('17 of 20 right under Lamp')).toBeInTheDocument();
      const misses = within(screen.getByRole('list', { name: 'Misses' }));
      expect(misses.getAllByRole('listitem')).toHaveLength(3);
      expect(misses.getAllByRole('img', { name: 'Your photo' })).toHaveLength(3);
      expect(misses.getAllByText(/^Read /)).toHaveLength(3);
      expect(misses.getAllByText(/^True /)).toHaveLength(1);
      expect(misses.getByText(`True ${named}`)).toBeInTheDocument();
      expect(misses.queryByText(`Read ${named}`)).not.toBeInTheDocument();
      expect(misses.getAllByText('Skipped')).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();

      // The last answer was a skip on a plain reading, so it goes back to its vote.
      await user.click(screen.getByRole('button', { name: 'Undo' }));
      expect(await screen.findByRole('group', { name: 'Is this its color?' })).toBeInTheDocument();
      expect(screen.getByText('20 of 20')).toBeInTheDocument();
      expect(value(await store.listCaptures())).toHaveLength(19);
    },
  );

  it('holds Undo and Another run while the export builds', { timeout: 15_000 }, async () => {
    const inner = fakeFieldStore();
    // Holds the frame reads until released, so the build stays in progress.
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
    const { user } = setup({ store });
    await start(user, '10');
    for (let n = 0; n < 9; n++) await yes(user);
    await shoot(user);
    await user.click(await screen.findByRole('button', { name: 'Yes' }));
    await user.click(await screen.findByRole('button', { name: 'Export' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Another run' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(value(await store.listCaptures())).toHaveLength(10);
    release();
    expect(await screen.findByRole('button', { name: 'Share the export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    expect(screen.getByText('10 of 10 right under Lamp')).toBeInTheDocument();
  });

  it(
    'exports the field set from the summary, and starts another run',
    { timeout: 15_000 },
    async () => {
      const { user } = setup();
      await start(user, '10');
      for (let n = 0; n < 9; n++) await yes(user);
      // The last one ends the run, so no camera follows it.
      await shoot(user);
      await user.click(await screen.findByRole('button', { name: 'Yes' }));
      expect(await screen.findByText('10 of 10 right under Lamp')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Misses' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Export' }));
      expect(await screen.findByRole('button', { name: 'Share the export' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Another run' }));
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    },
  );
});
