import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Frame, Pixels } from '../../model/frame';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { CameraContext } from './CameraContext';
import { Camera } from './Camera';
import { DARK_MESSAGE, PHOTO_FAILED } from './copy';
import { SAMPLE_INTERVAL_MS, type CameraPort, type CameraResult, type PhotoResult } from './port';

function solid(value: number): Pixels {
  const data = new Uint8ClampedArray(16);
  for (let i = 0; i < 16; i += 4) data.set([value, value, value, 255], i);
  return { width: 2, height: 2, data };
}

const bright: Frame = { pixels: solid(200), source: 'camera' };
const dark: Frame = { pixels: solid(10), source: 'camera' };

// The message appears twice once announced: in the banner or inline note,
// and in the Announcer's live region. This picks out the visible one.
const visible = { selector: 'p:not([role])' };

function fakeCamera(overrides: Partial<CameraPort> = {}) {
  const stop = vi.fn();
  const attach = vi.fn<CameraPort['attach']>();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const port: CameraPort = {
    open: vi.fn(() => Promise.resolve<CameraResult>({ ok: true, stream })),
    attach,
    readFrame: vi.fn(() => bright),
    readPhoto: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        frame: { pixels: solid(120), source: 'photo' as const },
      }),
    ),
    ...overrides,
  };
  return { port, stop, stream, attach };
}

function Where() {
  const { pathname, search } = useLocation();
  const { state } = useSession();
  const capture = state.capture ? `${state.capture.slot}:${state.capture.frame.source}` : 'none';
  return (
    <p>
      {pathname + search} capture={capture}
    </p>
  );
}

function renderAt(port: CameraPort, url = '/camera?slot=top') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SessionProvider>
        <Announcer>
          <InitialLocationContext value={true}>
            <CameraContext value={port}>
              <Routes>
                <Route path="/camera" element={<Camera />} />
                <Route path="/confirm" element={<Where />} />
                <Route path="/color" element={<Where />} />
                <Route path="/slot" element={<Where />} />
              </Routes>
            </CameraContext>
          </InitialLocationContext>
        </Announcer>
      </SessionProvider>
    </MemoryRouter>,
  );
}

function photoInput(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Camera', () => {
  it('sends a visitor with no slot to choose one, then back here', async () => {
    renderAt(fakeCamera().port, '/camera');
    expect(await screen.findByText(/^\/slot\?next=camera/)).toBeInTheDocument();
  });

  it('shows the shutter and the photo route once the camera is live', async () => {
    const { port, stream, attach } = fakeCamera();
    renderAt(port);
    expect(await screen.findByRole('button', { name: 'Take photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pick by hand' })).not.toBeInTheDocument();
    // Waited for, for the reason `liveWith` below gives.
    await waitFor(() => expect(attach).toHaveBeenCalledWith(expect.any(HTMLVideoElement), stream));
  });

  it('captures the current frame for the chosen slot and moves on', async () => {
    const user = userEvent.setup();
    renderAt(fakeCamera().port);
    await user.click(await screen.findByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText('/confirm?slot=top capture=top:camera')).toBeInTheDocument();
  });

  it('does nothing when the shutter is pressed before the video has a frame', async () => {
    const user = userEvent.setup();
    renderAt(fakeCamera({ readFrame: vi.fn(() => null) }).port);
    await user.click(await screen.findByRole('button', { name: 'Take photo' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Frame the garment' }),
    ).toBeInTheDocument();
  });

  it('takes a chosen photo the same way', async () => {
    const { container } = renderAt(fakeCamera().port);
    await screen.findByRole('button', { name: 'Take photo' });
    fireEvent.change(photoInput(container), {
      target: { files: [new File(['x'], 'shirt.jpg')] },
    });
    expect(await screen.findByText('/confirm?slot=top capture=top:photo')).toBeInTheDocument();
  });

  it('says so when a photo will not open, and lets the same one be chosen again', async () => {
    const readPhoto = vi.fn(() =>
      Promise.resolve({ ok: false as const, reason: 'undecodable' as const }),
    );
    const { container } = renderAt(fakeCamera({ readPhoto }).port);
    await screen.findByRole('button', { name: 'Take photo' });
    const input = photoInput(container);
    fireEvent.change(input, { target: { files: [new File(['x'], 'broken.jpg')] } });
    expect(await screen.findByText(PHOTO_FAILED, visible)).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it.each([
    ['denied', "huemi can't see your camera"],
    ['unavailable', 'No camera found'],
    ['failed', "The camera didn't start"],
  ] as const)('shows the %s panel with a way to pick by hand', async (reason, heading) => {
    renderAt(
      fakeCamera({ open: vi.fn(() => Promise.resolve({ ok: false as const, reason })) }).port,
    );
    expect(await screen.findByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pick by hand' })).toHaveAttribute(
      'href',
      '/color?slot=top',
    );
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take photo' })).not.toBeInTheDocument();
  });

  it('opens the camera again when asked to try again', async () => {
    const user = userEvent.setup();
    const { port } = fakeCamera();
    const open = vi
      .fn<CameraPort['open']>()
      .mockResolvedValueOnce({ ok: false, reason: 'failed' })
      .mockImplementation(() => port.open());
    renderAt({ ...port, open });
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Take photo' })).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('leaves a user where they went if their photo opens after they left', async () => {
    const user = userEvent.setup();
    let resolve!: (result: PhotoResult) => void;
    const readPhoto = vi.fn(() => new Promise<PhotoResult>((r) => (resolve = r)));
    const { container } = renderAt(
      fakeCamera({
        open: vi.fn(() => Promise.resolve({ ok: false as const, reason: 'denied' as const })),
        readPhoto,
      }).port,
    );
    await screen.findByRole('link', { name: 'Pick by hand' });
    fireEvent.change(photoInput(container), { target: { files: [new File(['x'], 'big.jpg')] } });
    await user.click(screen.getByRole('link', { name: 'Pick by hand' }));
    expect(await screen.findByText('/color?slot=top capture=none')).toBeInTheDocument();
    await act(() => {
      resolve({ ok: true, frame: bright });
      return Promise.resolve();
    });
    expect(screen.getByText('/color?slot=top capture=none')).toBeInTheDocument();
  });

  it('keeps focus on the heading when trying again, rather than dropping it', async () => {
    const user = userEvent.setup();
    const open = vi.fn(() => Promise.resolve({ ok: false as const, reason: 'failed' as const }));
    renderAt(fakeCamera({ open }).port);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Frame the garment' })).toHaveFocus();
  });

  it('says what went wrong when the camera does not open', async () => {
    renderAt(
      fakeCamera({
        open: vi.fn(() => Promise.resolve({ ok: false as const, reason: 'denied' as const })),
      }).port,
    );
    await screen.findByRole('heading', { level: 2, name: "huemi can't see your camera" });
    // Waited for: the announcement is an effect of the render that shows the
    // panel, and runs just after it (see `liveWith` below).
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent("huemi can't see your camera"),
    );
  });

  it('stops the camera when the screen goes away', async () => {
    const { port, stop } = fakeCamera();
    const { unmount } = renderAt(port);
    await screen.findByRole('button', { name: 'Take photo' });
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('stops a camera that only opens after the screen has gone', async () => {
    const { port, stop, stream } = fakeCamera();
    let resolve!: (result: CameraResult) => void;
    const open = vi.fn(() => new Promise<CameraResult>((r) => (resolve = r)));
    const { unmount } = renderAt({ ...port, open });
    unmount();
    await act(() => {
      resolve({ ok: true, stream });
      return Promise.resolve();
    });
    expect(stop).toHaveBeenCalled();
  });

  describe('in low light', () => {
    async function liveWith(readFrame: CameraPort['readFrame']) {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { port, attach } = fakeCamera({ readFrame });
      renderAt(port);
      await screen.findByRole('button', { name: 'Take photo' });
      // The shutter can be on screen before the effects of that render have
      // run, because the camera's answer arrives outside act. Attaching runs
      // in the same commit as the sampling interval and is declared before
      // it, so once attach has been called the interval exists. Advancing the
      // clock any earlier fires no samples, which is how this failed under
      // the full suite's load and passed alone.
      await waitFor(() => expect(attach).toHaveBeenCalled());
    }

    function tick(samples: number) {
      act(() => {
        vi.advanceTimersByTime(SAMPLE_INTERVAL_MS * samples);
      });
    }

    it('warns, offers a way out, and says so once', async () => {
      await liveWith(vi.fn(() => dark));
      tick(2);
      expect(screen.getByText(DARK_MESSAGE, visible)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Pick by hand' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(DARK_MESSAGE);
      // The shutter keeps working in the dark; confirm corrects a poor read.
      expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument();
    });

    it('does not warn on a single dark reading', async () => {
      const readFrame = vi
        .fn<CameraPort['readFrame']>()
        .mockReturnValueOnce(dark)
        .mockReturnValue(bright);
      await liveWith(readFrame);
      tick(3);
      expect(screen.queryByText(DARK_MESSAGE, visible)).not.toBeInTheDocument();
    });

    it('clears the warning once the light comes back', async () => {
      const readFrame = vi
        .fn<CameraPort['readFrame']>()
        .mockReturnValueOnce(dark)
        .mockReturnValueOnce(dark)
        .mockReturnValue(bright);
      await liveWith(readFrame);
      tick(2);
      expect(screen.getByText(DARK_MESSAGE, visible)).toBeInTheDocument();
      tick(2);
      expect(screen.queryByText(DARK_MESSAGE, visible)).not.toBeInTheDocument();
    });
  });
});
