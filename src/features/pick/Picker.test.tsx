import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
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
});
