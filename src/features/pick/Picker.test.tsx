import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PALETTE } from '../../color/palette';
import { parseHex, type Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { CORRECTIONS_KEY } from '../../storage/localCorrections';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { Picker } from './Picker';

function Where() {
  const { pathname, search } = useLocation();
  const { state } = useSession();
  return (
    <p>
      {pathname + search} base={state.base ? `${state.base.slot}:${state.base.hex}` : 'none'}
    </p>
  );
}

function Before() {
  return <p>before screen</p>;
}

function GoBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      go back
    </button>
  );
}

// A capture whose reading the confirm screen turned down, seeded through
// real dispatches and a client navigation, the way the confirm screen leaves.
function Rejected({ slot, read, to }: { slot: Slot; read: Hex; to: string }) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    const pixels = { width: 1, height: 1, data: new Uint8ClampedArray([43, 53, 80, 255]) };
    dispatch({ type: 'frameCaptured', slot, frame: { pixels, source: 'camera' } });
    dispatch({ type: 'readingRejected', slot, read });
    void navigate(to);
  }, [dispatch, navigate, slot, read, to]);
  return null;
}

function corrections(): unknown {
  return JSON.parse(localStorage.getItem(CORRECTIONS_KEY) ?? '[]');
}

function renderAt(url: string, rejected?: { slot: Slot; read: Hex }) {
  render(
    <MemoryRouter initialEntries={[rejected ? '/seed' : url]}>
      <SessionProvider>
        <InitialLocationContext value={true}>
          <Routes>
            <Route path="/seed" element={rejected && <Rejected {...rejected} to={url} />} />
            <Route path="/color" element={<Picker />} />
            <Route path="/suggest" element={<Where />} />
            <Route path="/slot" element={<p>slot screen</p>} />
          </Routes>
        </InitialLocationContext>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('Picker', () => {
  it('offers every palette colour', () => {
    renderAt('/color?slot=top');
    for (const { name } of PALETTE) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('records the base and moves on', async () => {
    const user = userEvent.setup();
    renderAt('/color?slot=top');
    await user.click(screen.getByRole('button', { name: 'Navy' }));
    expect(
      await screen.findByText(/\/suggest\?slot=top&hex=%231f2a44 base=top:#1f2a44/),
    ).toBeInTheDocument();
  });

  it('sends a visitor with no slot back to choose one', async () => {
    renderAt('/color');
    expect(await screen.findByText('slot screen')).toBeInTheDocument();
  });

  it('offers free selection without putting a spectrum on this screen', () => {
    renderAt('/color?slot=top');
    expect(screen.getByRole('link', { name: 'Mix your own' })).toHaveAttribute(
      'href',
      '/color/custom?slot=top',
    );
  });

  it('carries the base in the URL, not only in the session', async () => {
    const user = userEvent.setup();
    renderAt('/color?slot=top');
    await user.click(screen.getByRole('button', { name: 'Navy' }));
    expect(await screen.findByText(/\/suggest\?slot=top&hex=%231f2a44/)).toBeInTheDocument();
  });

  // The redirect for a missing slot uses `replace`, not a plain navigation:
  // a plain one would leave `/color` on the history stack, so going back
  // from `/slot` would land on `/color` again, which redirects right back to
  // `/slot` and traps the user bouncing between the two. `replace` overwrites
  // `/color` in place, so back from `/slot` goes to whatever came before it.
  it('replaces on the no-slot redirect, so back does not bounce between /color and /slot', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/before', '/color']} initialIndex={1}>
        <SessionProvider>
          <InitialLocationContext value={true}>
            <Routes>
              <Route path="/before" element={<Before />} />
              <Route path="/color" element={<Picker />} />
              <Route path="/slot" element={<GoBack />} />
            </Routes>
          </InitialLocationContext>
        </SessionProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'go back' }));
    expect(await screen.findByText('before screen')).toBeInTheDocument();
  });
});

// A reading the confirm screen turned down travels here in the session.
describe('Picker, after a rejected reading', () => {
  const read = parseHex('#2b3550');
  const navy = parseHex('#1f2a44');

  beforeEach(() => {
    localStorage.clear();
  });

  it('records the reading against the color picked', async () => {
    const user = userEvent.setup();
    renderAt('/color?slot=top', { slot: 'top', read });
    await user.click(await screen.findByRole('button', { name: 'Navy' }));
    await screen.findByText(/^\/suggest/);
    const list = corrections() as { at: string }[];
    expect(list).toEqual([{ slot: 'top', read, corrected: navy, at: list[0]?.at }]);
    expect(Number.isNaN(Date.parse(list[0]!.at))).toBe(false);
  });

  it('records nothing for a reading of another slot', async () => {
    const user = userEvent.setup();
    renderAt('/color?slot=shoes', { slot: 'top', read });
    await user.click(await screen.findByRole('button', { name: 'Navy' }));
    await screen.findByText(/^\/suggest/);
    expect(corrections()).toEqual([]);
  });

  it('records nothing when the color picked is the reading', async () => {
    const user = userEvent.setup();
    renderAt('/color?slot=top', { slot: 'top', read: navy });
    await user.click(await screen.findByRole('button', { name: 'Navy' }));
    await screen.findByText(/^\/suggest/);
    expect(corrections()).toEqual([]);
  });

  it('records once, however often the user comes back to pick again', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/seed']}>
        <SessionProvider>
          <InitialLocationContext value={true}>
            <Routes>
              <Route
                path="/seed"
                element={<Rejected slot="top" read={read} to="/color?slot=top" />}
              />
              <Route path="/color" element={<Picker />} />
              <Route path="/suggest" element={<GoBack />} />
            </Routes>
          </InitialLocationContext>
        </SessionProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Navy' }));
    await user.click(await screen.findByRole('button', { name: 'go back' }));
    await user.click(await screen.findByRole('button', { name: 'Cream' }));
    await screen.findByRole('button', { name: 'go back' });
    expect(corrections()).toHaveLength(1);
  });
});

// The screen's parent in the flow, fixed whatever route led here.
describe('Picker back arrow', () => {
  it('goes back to Choose a garment', () => {
    renderAt('/color?slot=top');
    expect(screen.getByRole('link', { name: 'Back to Choose a garment' })).toHaveAttribute(
      'href',
      '/slot',
    );
  });
});
