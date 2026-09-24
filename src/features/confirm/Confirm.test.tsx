import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { nearbyColors } from '../../color/palette';
import { readColor } from '../../color/read';
import { NAVY, solid } from '../../color/testing';
import type { Pixels } from '../../model/frame';
import type { Slot } from '../../model/types';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { Confirm } from './Confirm';
import {
  CAPTION_CORRECTED,
  CAPTION_READ,
  CLOSER,
  DONE,
  LOOKS_RIGHT,
  NOT_QUITE,
  PICK_BY_HAND,
  TITLE_SINGLE,
  USE_THIS,
} from './copy';

// Seeding goes through the real flow, a dispatch and then a client
// navigation, so that Screen moves focus the way it does in the app.
function Seed({ pixels, slot = 'top' }: { pixels: Pixels; slot?: Slot }) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    dispatch({ type: 'frameCaptured', slot, frame: { pixels, source: 'camera' } });
    void navigate('/confirm?slot=top');
  }, [dispatch, navigate, pixels, slot]);
  return null;
}

function Where() {
  const { pathname, search } = useLocation();
  const { state } = useSession();
  return (
    <p>
      {pathname + search} base={state.base ? `${state.base.slot}:${state.base.hex}` : 'none'}
    </p>
  );
}

function GoBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      go back
    </button>
  );
}

function renderWith(pixels: Pixels | null, slot: Slot = 'top') {
  render(
    <MemoryRouter initialEntries={[pixels ? '/seed' : '/confirm?slot=top']}>
      <SessionProvider>
        <Announcer>
          <InitialLocationContext value={false}>
            <Routes>
              <Route path="/seed" element={pixels && <Seed pixels={pixels} slot={slot} />} />
              <Route path="/confirm" element={<Confirm />} />
              <Route path="/camera" element={<Where />} />
              <Route path="/color" element={<Where />} />
              <Route
                path="/suggest"
                element={
                  <>
                    <Where />
                    <GoBack />
                  </>
                }
              />
            </Routes>
          </InitialLocationContext>
        </Announcer>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('Confirm', () => {
  it('sends a visit with nothing captured back to the camera', async () => {
    renderWith(null);
    expect(await screen.findByText(/^\/camera\?slot=top/)).toBeInTheDocument();
  });

  it('sends a capture for another slot back to the camera', async () => {
    renderWith(solid(NAVY), 'bottom');
    expect(await screen.findByText(/^\/camera\?slot=top/)).toBeInTheDocument();
  });

  it('shows what it read', async () => {
    renderWith(solid(NAVY));
    expect(await screen.findByRole('heading', { level: 1, name: TITLE_SINGLE })).toHaveFocus();
    expect(screen.getByText(CAPTION_READ)).toBeInTheDocument();
    expect(screen.getByText('Navy')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Top: Navy' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Your photo' })).toBeInTheDocument();
  });

  it('confirms the reading and moves on to suggestions', async () => {
    const user = userEvent.setup();
    renderWith(solid(NAVY));
    await user.click(await screen.findByRole('button', { name: LOOKS_RIGHT }));
    expect(await screen.findByText(/^\/suggest\?slot=top&hex=%23/)).toBeInTheDocument();
    expect(screen.getByText(/base=top:#/)).toBeInTheDocument();
  });

  it('corrects without starting over', async () => {
    const user = userEvent.setup();
    renderWith(solid(NAVY));
    const notQuite = await screen.findByRole('button', { name: NOT_QUITE });
    expect(notQuite).toHaveAttribute('aria-expanded', 'false');
    await user.click(notQuite);
    expect(screen.getByRole('button', { name: DONE, expanded: true })).toHaveAttribute(
      'aria-controls',
      'correction',
    );
    const swatches = within(screen.getByRole('group', { name: CLOSER })).getAllByRole('button');
    await user.click(swatches[1]!);
    expect(screen.getByText(CAPTION_CORRECTED)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: USE_THIS })).toBeInTheDocument();
    // Back to the reading undoes the correction.
    await user.click(swatches[0]!);
    expect(screen.getByText(CAPTION_READ)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: LOOKS_RIGHT })).toBeInTheDocument();
  });

  it('keeps a correction when the panel closes', async () => {
    const user = userEvent.setup();
    renderWith(solid(NAVY));
    await user.click(await screen.findByRole('button', { name: NOT_QUITE }));
    const swatches = within(screen.getByRole('group', { name: CLOSER })).getAllByRole('button');
    await user.click(swatches[1]!);
    await user.click(screen.getByRole('button', { name: DONE }));
    expect(screen.queryByRole('group', { name: CLOSER })).not.toBeInTheDocument();
    expect(screen.getByText(CAPTION_CORRECTED)).toBeInTheDocument();
  });

  // The handle unmounts with the panel, so focus has to go somewhere on
  // purpose. A swipe-down dismissal takes the same onClose path.
  it('gives focus back to the toggle when the panel closes from its handle', async () => {
    const user = userEvent.setup();
    renderWith(solid(NAVY));
    await user.click(await screen.findByRole('button', { name: NOT_QUITE }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('group', { name: CLOSER })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: NOT_QUITE })).toHaveFocus();
  });

  it('confirms the corrected color, not the reading', async () => {
    const user = userEvent.setup();
    const reading = readColor(solid(NAVY));
    if (reading.kind !== 'single') throw new Error('expected a single reading of navy');
    const nearest = nearbyColors(reading.color, 4)[0]!.hex;
    renderWith(solid(NAVY));
    await user.click(await screen.findByRole('button', { name: NOT_QUITE }));
    const swatches = within(screen.getByRole('group', { name: CLOSER })).getAllByRole('button');
    await user.click(swatches[1]!);
    await user.click(screen.getByRole('button', { name: USE_THIS }));
    expect(
      await screen.findByText(
        `/suggest?slot=top&hex=${encodeURIComponent(nearest)} base=top:${nearest}`,
      ),
    ).toBeInTheDocument();
  });

  it('offers picking by hand', async () => {
    renderWith(solid(NAVY));
    expect(await screen.findByRole('link', { name: PICK_BY_HAND })).toHaveAttribute(
      'href',
      '/color?slot=top',
    );
  });

  // The base was chosen, which clears the capture, and back returns here.
  it('goes back to the camera when revisited after confirming', async () => {
    const user = userEvent.setup();
    renderWith(solid(NAVY));
    await user.click(await screen.findByRole('button', { name: LOOKS_RIGHT }));
    await user.click(await screen.findByRole('button', { name: 'go back' }));
    expect(await screen.findByText(/^\/camera\?slot=top/)).toBeInTheDocument();
  });

  // The e2e photo fixture is a single pixel.
  it('handles a one-pixel photo', async () => {
    renderWith(solid(NAVY, 1));
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
