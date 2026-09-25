import { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rgb } from '../../color/convert';
import { colorName } from '../../color/palette';
import { busy, NAVY, paint, WHITE } from '../../color/testing';
import type { Pixels } from '../../model/frame';
import { CHECK_SLOTS } from '../../model/types';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { CheckTap } from './CheckTap';
import { ENTER_COLORS, SKIP, TAP_PROMPTS, TAP_UNCLEAR } from './copy';

// Palette colors, so each band reads back under its palette name.
const CHARCOAL: Rgb = [61, 61, 63];
const CREAM: Rgb = [233, 223, 201];
const RUST: Rgb = [164, 82, 45];
const BURGUNDY: Rgb = [107, 39, 51];

// Four 50px bands, head to toe, one per check slot.
const outfit = paint(100, 200, (_x, y) => [CHARCOAL, CREAM, RUST, BURGUNDY][Math.floor(y / 50)]!);

// The top band striped 3:2 instead, which reads as a pattern.
const stripedTop = paint(100, 200, (_x, y) => {
  if (y >= 50 && y < 100) return y % 10 < 6 ? NAVY : WHITE;
  return [CHARCOAL, CREAM, RUST, BURGUNDY][Math.floor(y / 50)]!;
});

// A busy grid over the outerwear band, which reads as unclear. Offset so the
// tap at (50, 25) samples the grid around (90, 90), the spot Confirm.test.tsx
// already relies on reading as unclear at this tap radius.
const busyOuterwear = paint(100, 200, (x, y) =>
  y < 50 ? busy(x + 40, y + 65) : [CHARCOAL, CREAM, RUST, BURGUNDY][Math.floor(y / 50)]!,
);

function Seed({ pixels }: { pixels: Pixels }) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    dispatch({ type: 'checkPhotoTaken', frame: { pixels, source: 'camera' } });
    void navigate('/check/tap');
  }, [dispatch, navigate, pixels]);
  return null;
}

// A patterned piece carries no `read` (#23), so the suffix below marks that:
// invisible on every other piece here, since a plain band's reading and its
// stored hex are the same color.
function Where() {
  const { pathname } = useLocation();
  const { state } = useSession();
  const pieces = CHECK_SLOTS.map((slot) => {
    const piece = state.check?.pieces[slot];
    if (!piece) return `${slot}=-`;
    return `${slot}=${colorName(piece.hex)}${piece.read ? '' : '(no read)'}`;
  }).join(' ');
  return (
    <p>
      {pathname} {pieces}
    </p>
  );
}

function renderWith(pixels: Pixels | null) {
  render(
    <MemoryRouter initialEntries={[pixels ? '/seed' : '/check/tap']}>
      <SessionProvider>
        <Announcer>
          <InitialLocationContext value={false}>
            <Routes>
              <Route path="/seed" element={pixels && <Seed pixels={pixels} />} />
              <Route path="/check" element={<Where />} />
              <Route path="/check/tap" element={<CheckTap />} />
              <Route path="/check/pieces" element={<Where />} />
            </Routes>
          </InitialLocationContext>
        </Announcer>
      </SessionProvider>
    </MemoryRouter>,
  );
}

// jsdom lays nothing out. The photo is 100x200 CSS px, one per frame pixel,
// so `contain` maps a client point straight onto the frame.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 200,
  } as DOMRect);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const photo = () => screen.getByRole('img', { name: 'Your photo' });
const tapBand = (band: number) =>
  fireEvent.click(photo(), { clientX: 50, clientY: 25 + 50 * band });

describe('CheckTap', () => {
  it('sends a visit with no photo back to the camera', async () => {
    renderWith(null);
    expect(await screen.findByText(/^\/check /)).toBeInTheDocument();
  });

  it('asks for each piece head to toe and ends on the list', async () => {
    renderWith(outfit);
    expect(
      await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.outerwear}, 1 of 4` }),
    ).toHaveFocus();
    tapBand(0);
    expect(
      await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.top}, 2 of 4` }),
    ).toHaveFocus();
    tapBand(1);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.bottom}, 3 of 4` });
    tapBand(2);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.shoes}, 4 of 4` });
    tapBand(3);
    expect(
      await screen.findByText(
        '/check/pieces outerwear=Charcoal top=Cream bottom=Rust shoes=Burgundy',
      ),
    ).toBeInTheDocument();
  });

  it('leaves a skipped piece empty', async () => {
    const user = userEvent.setup();
    renderWith(outfit);
    await user.click(await screen.findByRole('button', { name: SKIP }));
    tapBand(1);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.bottom}, 3 of 4` });
    tapBand(2);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.shoes}, 4 of 4` });
    await user.click(screen.getByRole('button', { name: SKIP }));
    expect(
      await screen.findByText('/check/pieces outerwear=- top=Cream bottom=Rust shoes=-'),
    ).toBeInTheDocument();
  });

  it('takes the largest color of a patterned piece and moves on', async () => {
    renderWith(stripedTop);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.outerwear}, 1 of 4` });
    tapBand(0);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.top}, 2 of 4` });
    tapBand(1);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.bottom}, 3 of 4` });
    tapBand(2);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.shoes}, 4 of 4` });
    tapBand(3);
    expect(await screen.findByText(/top=Navy\(no read\)/)).toBeInTheDocument();
  });

  it('stays on the piece and says so when a tap reads nothing clear', async () => {
    renderWith(busyOuterwear);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.outerwear}, 1 of 4` });
    tapBand(0);
    // Once on the page, once in the live region.
    expect(await screen.findAllByText(TAP_UNCLEAR)).toHaveLength(2);
    expect(
      screen.getByRole('heading', { level: 1, name: `${TAP_PROMPTS.outerwear}, 1 of 4` }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tap-mark')).toBeInTheDocument();
  });

  it('can leave for the list at any point, keeping what was read', async () => {
    const user = userEvent.setup();
    renderWith(outfit);
    await screen.findByRole('heading', { level: 1, name: `${TAP_PROMPTS.outerwear}, 1 of 4` });
    tapBand(0);
    await user.click(await screen.findByRole('link', { name: ENTER_COLORS }));
    expect(
      await screen.findByText('/check/pieces outerwear=Charcoal top=- bottom=- shoes=-'),
    ).toBeInTheDocument();
  });
});
