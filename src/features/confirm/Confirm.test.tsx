import { useEffect } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { colorName } from '../../color/palette';
import { readColor } from '../../color/read';
import { NAVY, WHITE, busy, paint, solid } from '../../color/testing';
import type { Pixels } from '../../model/frame';
import { parseHex } from '../../model/hex';
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
  colorAction,
  DONE,
  LOOKS_RIGHT,
  NEITHER,
  NOT_QUITE,
  PICK_BY_HAND,
  STILL_UNCLEAR,
  TAP_ELSEWHERE,
  TITLE_SEVERAL,
  TITLE_SINGLE,
  TITLE_UNCLEAR,
  UNCLEAR_BODY,
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

  // The panel renders above the toggle, so from the toggle the next Tab goes to
  // "Looks right" and the panel is behind the user in reading order.
  it('moves focus into the panel, onto the selected swatch, when it opens', async () => {
    const user = userEvent.setup();
    renderWith(solid(NAVY));
    await user.click(await screen.findByRole('button', { name: NOT_QUITE }));
    const group = screen.getByRole('group', { name: CLOSER });
    expect(within(group).getByRole('button', { pressed: true })).toHaveFocus();
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
    renderWith(solid(NAVY));
    await user.click(await screen.findByRole('button', { name: NOT_QUITE }));
    const swatches = within(screen.getByRole('group', { name: CLOSER })).getAllByRole('button');
    const chosen = swatches[1]!.textContent;
    await user.click(swatches[1]!);
    await user.click(screen.getByRole('button', { name: USE_THIS }));
    const where = await screen.findByText(/^\/suggest\?slot=top&hex=%23/);
    const base = /base=top:(#[0-9a-f]{6})/.exec(where.textContent)![1]!;
    expect(base).not.toBe(reading.color);
    expect(colorName(parseHex(base))).toBe(chosen);
    expect(where).toHaveTextContent(`hex=${encodeURIComponent(base)}`);
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

describe('Confirm, several', () => {
  // 60/40 navy and white bands, as in read.test.ts.
  const stripes = () => paint(100, 100, (_x, y) => (y % 10 < 6 ? NAVY : WHITE));

  it('asks which color a patterned garment is, largest first and chosen', async () => {
    renderWith(stripes());
    expect(
      await screen.findByRole('heading', { level: 1, name: TITLE_SEVERAL }),
    ).toBeInTheDocument();
    const choices = within(screen.getByRole('group', { name: TITLE_SEVERAL })).getAllByRole(
      'button',
    );
    expect(choices).toHaveLength(2);
    expect(choices[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: colorAction('Navy') })).toBeInTheDocument();
  });

  it('uses the one chosen', async () => {
    const user = userEvent.setup();
    renderWith(stripes());
    const choices = within(await screen.findByRole('group', { name: TITLE_SEVERAL })).getAllByRole(
      'button',
    );
    await user.click(choices[1]!);
    const use = screen.getByRole('button', { name: /^Use / });
    expect(use).not.toHaveAccessibleName(colorAction('Navy'));
    await user.click(use);
    expect(await screen.findByText(/^\/suggest/)).toBeInTheDocument();
  });

  it('lets the user pick by hand instead', async () => {
    renderWith(stripes());
    expect(await screen.findByRole('link', { name: NEITHER })).toHaveAttribute(
      'href',
      '/color?slot=top',
    );
  });

  // Review focus 3: two shades that share a name must still be told apart.
  // This shade is stepped off NAVY in OKLab L, far enough that the reader
  // keeps them as two groups but close enough that colorName still calls
  // both of them "Navy" (measured; see task-8-report.md).
  it('names each choice with its share, so two of one name differ', async () => {
    const twoNavies = paint(100, 100, (_x, y) => (y % 10 < 6 ? NAVY : [10, 18, 38]));
    renderWith(twoNavies);
    const group = await screen.findByRole('group', { name: TITLE_SEVERAL });
    const names = within(group)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('Confirm, unclear', () => {
  // A solid navy patch in the top-left quadrant, over a busy background of
  // five colors in 8px squares. Coordinates checked in a scratch test against
  // `readColor(pixels, tapRegion(pixels, x, y))`: the default region (centered)
  // sees only the busy background and comes back unclear; a tap inside the
  // patch lands on solid navy, and a tap in the far corner stays on the busy
  // background and stays unclear too.
  const busyWithPatch = () => paint(100, 100, (x, y) => (x < 40 && y < 40 ? NAVY : busy(x, y)));

  function stubLayout() {
    // jsdom lays nothing out. The photo is 100x100 CSS px, one per frame pixel.
    const photo = screen.getByRole('img', { name: 'Your photo' });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    return photo;
  }

  it('asks for a tap when nothing covers enough of the photo', async () => {
    renderWith(paint(100, 100, busy));
    expect(
      await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR }),
    ).toBeInTheDocument();
    expect(screen.getByText(UNCLEAR_BODY)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: PICK_BY_HAND })).toBeInTheDocument();
  });

  it('reads again where the user tapped', async () => {
    renderWith(busyWithPatch());
    await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR });
    fireEvent.click(stubLayout(), { clientX: 20, clientY: 20 });
    expect(await screen.findByRole('heading', { level: 1, name: TITLE_SINGLE })).toHaveFocus();
    expect(screen.getByText('Navy')).toBeInTheDocument();
  });

  // The color block beside the photo already answers what was read once the
  // screen leaves unclear; the ring is only for pointing at the garment.
  // Going back to unclear remounts FramePhoto (Screen's key change), which
  // swaps in a fresh canvas node, so the rect is stubbed on the prototype
  // here rather than on one instance the way `stubLayout` does for a tap.
  it('shows the tap mark only while asking for a tap', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    } as DOMRect);
    renderWith(busyWithPatch());
    await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR });
    fireEvent.click(screen.getByRole('img', { name: 'Your photo' }), { clientX: 20, clientY: 20 });
    await screen.findByRole('heading', { level: 1, name: TITLE_SINGLE });
    expect(screen.queryByTestId('tap-mark')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: TAP_ELSEWHERE }));
    await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR });
    expect(screen.getByTestId('tap-mark')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('says so when a tap is still unclear, through the live region too', async () => {
    renderWith(busyWithPatch());
    await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR });
    fireEvent.click(stubLayout(), { clientX: 90, clientY: 90 });
    expect(await screen.findAllByText(STILL_UNCLEAR)).toHaveLength(2);
  });

  it('can go back to tapping after a tap reading', async () => {
    const user = userEvent.setup();
    renderWith(busyWithPatch());
    await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR });
    fireEvent.click(stubLayout(), { clientX: 20, clientY: 20 });
    await user.click(await screen.findByRole('button', { name: TAP_ELSEWHERE }));
    expect(
      await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR }),
    ).toBeInTheDocument();
  });

  it('offers no tap-again on a reading that was not tapped', async () => {
    renderWith(solid(NAVY));
    await screen.findByRole('heading', { level: 1, name: TITLE_SINGLE });
    expect(screen.queryByRole('button', { name: TAP_ELSEWHERE })).not.toBeInTheDocument();
  });

  // A portrait box (the shape the real confirm screen measures) holding a
  // square frame: cover would crop 50px off each side to fill it, contain
  // does not. The patch sits where only contain's view reaches: at frame
  // (10, 10) it is on the patch, but the same tap under cover would land at
  // frame (30, 30), still plain busy background.
  it('reads the part of the frame cover would have cropped away', async () => {
    const patchNearEdge = () => paint(100, 100, (x, y) => (x < 20 && y < 20 ? NAVY : busy(x, y)));
    renderWith(patchNearEdge());
    await screen.findByRole('heading', { level: 1, name: TITLE_UNCLEAR });
    const photo = screen.getByRole('img', { name: 'Your photo' });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 200 }) as DOMRect;
    fireEvent.click(photo, { clientX: 10, clientY: 60 });
    expect(await screen.findByRole('heading', { level: 1, name: TITLE_SINGLE })).toHaveFocus();
  });
});
