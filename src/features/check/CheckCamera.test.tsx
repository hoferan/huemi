import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Frame } from '../../model/frame';
import { parseHex } from '../../model/hex';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { CameraContext } from '../camera/CameraContext';
import type { CameraPort } from '../camera/port';
import { CheckCamera } from './CheckCamera';
import { CAPTURE_TITLE, ENTER_COLORS } from './copy';

const frame: Frame = {
  pixels: { width: 1, height: 1, data: new Uint8ClampedArray([200, 200, 200, 255]) },
  source: 'camera',
};

function port(overrides: Partial<CameraPort> = {}): CameraPort {
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  return {
    open: vi.fn(() => Promise.resolve({ ok: true as const, stream })),
    attach: vi.fn(),
    readFrame: vi.fn(() => frame),
    readPhoto: vi.fn(() => Promise.resolve({ ok: true as const, frame })),
    ...overrides,
  };
}

function Where() {
  const { pathname } = useLocation();
  const { state } = useSession();
  const pieces = Object.keys(state.check?.pieces ?? {}).join(',') || 'none';
  return (
    <p>
      {pathname} photo={state.check?.photo ? 'yes' : 'no'} pieces={pieces}
    </p>
  );
}

// A piece left over from an earlier check, set before /check is visited.
function Leftover() {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    dispatch({ type: 'checkPieceSet', slot: 'top', hex: parseHex('#e9dfc9') });
    void navigate('/check');
  }, [dispatch, navigate]);
  return null;
}

function renderAt(camera: CameraPort, path = '/check') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <Announcer>
          <InitialLocationContext value={true}>
            <CameraContext value={camera}>
              <Routes>
                <Route path="/leftover" element={<Leftover />} />
                <Route path="/check" element={<CheckCamera />} />
                <Route path="/check/tap" element={<Where />} />
                <Route path="/check/pieces" element={<Where />} />
              </Routes>
            </CameraContext>
          </InitialLocationContext>
        </Announcer>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('CheckCamera', () => {
  it('captures the outfit and moves on to tapping its pieces', async () => {
    const user = userEvent.setup();
    renderAt(port());
    expect(screen.getByRole('heading', { level: 1, name: CAPTURE_TITLE })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText('/check/tap photo=yes pieces=none')).toBeInTheDocument();
  });

  it('starts a fresh check, so an earlier outfit leaves nothing behind', async () => {
    const user = userEvent.setup();
    renderAt(port(), '/leftover');
    await user.click(await screen.findByRole('link', { name: ENTER_COLORS }));
    expect(await screen.findByText('/check/pieces photo=no pieces=none')).toBeInTheDocument();
  });

  it('offers entering the colors when the camera is blocked', async () => {
    renderAt(
      port({
        open: vi.fn(() => Promise.resolve({ ok: false as const, reason: 'denied' as const })),
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: "huemi can't see your camera" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ENTER_COLORS })).toHaveAttribute(
      'href',
      '/check/pieces',
    );
  });
});
