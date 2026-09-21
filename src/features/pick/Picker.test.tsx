import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../color/palette';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { Picker } from './Picker';

function Where() {
  const { pathname } = useLocation();
  const { state } = useSession();
  return (
    <p>
      {pathname} base={state.base ? `${state.base.slot}:${state.base.hex}` : 'none'}
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

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <SessionProvider>
        <InitialLocationContext value={true}>
          <Routes>
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
    expect(await screen.findByText(/\/suggest base=top:#1f2a44/)).toBeInTheDocument();
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
