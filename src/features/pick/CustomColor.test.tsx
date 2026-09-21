import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
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
        <Announcer>
          <InitialLocationContext value={true}>
            <Routes>
              <Route path="/color/custom" element={<CustomColor />} />
              <Route path="/suggest" element={<Where />} />
              <Route path="/slot" element={<p>slot screen</p>} />
            </Routes>
          </InitialLocationContext>
        </Announcer>
      </SessionProvider>
    </MemoryRouter>,
  );
}

// The sliders' default position (hue 210, saturation 40, lightness 50) names
// "Denim". Nudging saturation or hue by a little stays inside the same named
// bucket; raising lightness to 55 crosses into "Grey". Found by trying
// nearby values against colorName() directly, rather than guessed.
const DEFAULT_NAME = 'Denim';
const DIFFERENT_NAME = 'Grey';

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
    expect(named.textContent).toBe(DEFAULT_NAME);

    // fireEvent.change rather than userEvent: userEvent's pointer/keyboard
    // interactions move a range input by its step (1 here), which would take
    // 5 separate steps to reach the same assertion. A direct value change is
    // what a screen reader user's slider announcement would report too.
    fireEvent.change(screen.getByRole('slider', { name: 'Lightness' }), {
      target: { value: '55' },
    });

    expect(named.textContent).toBe(DIFFERENT_NAME);
  });

  it('announces the new name once dragging settles on a different colour', () => {
    renderAt('/color/custom?slot=top');
    // Mounting already announces the initial mix, so the live region starts
    // on the default name rather than empty.
    expect(screen.getByRole('status')).toHaveTextContent(DEFAULT_NAME);

    fireEvent.change(screen.getByRole('slider', { name: 'Lightness' }), {
      target: { value: '55' },
    });

    expect(screen.getByRole('status')).toHaveTextContent(DIFFERENT_NAME);
  });

  it('does not announce again while the name stays the same', () => {
    renderAt('/color/custom?slot=top');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(DEFAULT_NAME);
    // Announcer forces a DOM mutation on a repeated identical announcement by
    // appending a trailing no-break space; its exact text content is
    // therefore proof an announcement fired, not just a plausible read.
    const announcedOnce = status.textContent;

    // Saturation +1 (40 -> 41) stays inside the "Denim" bucket.
    fireEvent.change(screen.getByRole('slider', { name: 'Saturation' }), {
      target: { value: '41' },
    });

    expect(screen.getByTestId('custom-name')).toHaveTextContent(DEFAULT_NAME);
    expect(status.textContent).toBe(announcedOnce);
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

  // Same contract as the picker: the no-slot redirect uses `replace`, so back
  // from `/slot` does not land on `/color/custom` again and bounce forever.
  it('replaces on the no-slot redirect, so back does not bounce between /color/custom and /slot', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/before', '/color/custom']} initialIndex={1}>
        <SessionProvider>
          <Announcer>
            <InitialLocationContext value={true}>
              <Routes>
                <Route path="/before" element={<Before />} />
                <Route path="/color/custom" element={<CustomColor />} />
                <Route path="/slot" element={<GoBack />} />
              </Routes>
            </InitialLocationContext>
          </Announcer>
        </SessionProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'go back' }));
    expect(await screen.findByText('before screen')).toBeInTheDocument();
  });
});
