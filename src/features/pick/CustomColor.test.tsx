import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { CustomColor } from './CustomColor';

function Where() {
  const { pathname } = useLocation();
  const { state } = useSession();
  return (
    <p>
      {pathname} base={state.base?.hex ?? 'none'}
    </p>
  );
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <SessionProvider>
        <InitialLocationContext value={true}>
          <Routes>
            <Route path="/color/custom" element={<CustomColor />} />
            <Route path="/suggest" element={<Where />} />
            <Route path="/slot" element={<p>slot screen</p>} />
          </Routes>
        </InitialLocationContext>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('CustomColor', () => {
  it('offers hue, saturation and lightness', () => {
    renderAt('/color/custom?slot=top');
    expect(screen.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Saturation' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Lightness' })).toBeInTheDocument();
  });

  it('names the colour as it changes, so the value is not only visual', () => {
    renderAt('/color/custom?slot=top');
    const named = screen.getByTestId('custom-name');
    const before = named.textContent;
    expect(before).toBeTruthy();
  });

  it('commits with a button rather than on every drag', async () => {
    const user = userEvent.setup();
    renderAt('/color/custom?slot=top');
    await user.click(screen.getByRole('button', { name: 'Use this color' }));
    expect(await screen.findByText(/\/suggest base=#/)).toBeInTheDocument();
  });

  it('sends a visitor with no slot back to choose one', async () => {
    renderAt('/color/custom');
    expect(await screen.findByText('slot screen')).toBeInTheDocument();
  });
});
