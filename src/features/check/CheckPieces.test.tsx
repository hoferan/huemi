import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../../model/hex';
import type { CheckSlot } from '../../model/types';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { CORRECTIONS_KEY } from '../../storage/localCorrections';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { CheckPieces } from './CheckPieces';
import { CHECK_IT, NEED_TWO, NOT_WEARING, PIECES_TITLE } from './copy';

const rust = parseHex('#a4522d');
const cream = parseHex('#e9dfc9');

type Seeded = { slot: CheckSlot; hex: Hex; read?: Hex };

function Seed({ pieces }: { pieces: Seeded[] }) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    for (const piece of pieces) dispatch({ type: 'checkPieceSet', ...piece });
    void navigate('/check/pieces');
  }, [dispatch, navigate, pieces]);
  return null;
}

function Where() {
  return <p>{useLocation().pathname}</p>;
}

function renderWith(pieces: Seeded[] = []) {
  render(
    <MemoryRouter initialEntries={['/seed']}>
      <SessionProvider>
        <Announcer>
          <InitialLocationContext value={false}>
            <Routes>
              <Route path="/seed" element={<Seed pieces={pieces} />} />
              <Route path="/check/pieces" element={<CheckPieces />} />
              <Route path="/check/result" element={<Where />} />
            </Routes>
          </InitialLocationContext>
        </Announcer>
      </SessionProvider>
    </MemoryRouter>,
  );
}

function corrections(): unknown {
  return JSON.parse(localStorage.getItem(CORRECTIONS_KEY) ?? '[]');
}

beforeEach(() => {
  localStorage.clear();
});

describe('CheckPieces', () => {
  it('shows the four pieces, named where set', async () => {
    renderWith([{ slot: 'bottom', hex: rust, read: rust }]);
    expect(await screen.findByRole('heading', { level: 1, name: PIECES_TITLE })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Outerwear: not set' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Top: not set' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom: Rust' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shoes: not set' })).toBeInTheDocument();
  });

  it('sets a piece from the palette', async () => {
    const user = userEvent.setup();
    renderWith();
    await user.click(await screen.findByRole('button', { name: 'Top: not set' }));
    const sheet = await screen.findByRole('dialog', { name: 'Top' });
    expect(within(sheet).queryByRole('button', { name: NOT_WEARING })).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Cream' }));
    expect(await screen.findByRole('button', { name: 'Top: Cream' })).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Set by hand from empty: nothing was read, so nothing was corrected.
    expect(corrections()).toEqual([]);
  });

  it('empties a piece the user is not wearing, logging nothing', async () => {
    const user = userEvent.setup();
    renderWith([{ slot: 'bottom', hex: rust, read: rust }]);
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust' }));
    await user.click(await screen.findByRole('button', { name: NOT_WEARING }));
    expect(await screen.findByRole('button', { name: 'Bottom: not set' })).toBeInTheDocument();
    expect(corrections()).toEqual([]);
  });

  it('logs a change to a piece the photo read, against what it read', async () => {
    const user = userEvent.setup();
    renderWith([{ slot: 'bottom', hex: rust, read: rust }]);
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Camel' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Bottom: Camel' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Brown' }),
    );
    expect(corrections()).toEqual([
      expect.objectContaining({ slot: 'bottom', read: rust, corrected: parseHex('#b58a5a') }),
      expect.objectContaining({ slot: 'bottom', read: rust, corrected: parseHex('#5a3e2e') }),
    ]);
  });

  it('logs nothing when a piece is changed back to what the photo read', async () => {
    const user = userEvent.setup();
    renderWith([{ slot: 'bottom', hex: parseHex('#b58a5a'), read: rust }]);
    await user.click(await screen.findByRole('button', { name: 'Bottom: Camel' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rust' }),
    );
    expect(corrections()).toEqual([]);
  });

  it('asks for two pieces before checking, on screen and aloud', async () => {
    const user = userEvent.setup();
    renderWith([{ slot: 'top', hex: cream }]);
    await user.click(await screen.findByRole('button', { name: CHECK_IT }));
    expect(await screen.findAllByText(NEED_TWO)).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: PIECES_TITLE })).toBeInTheDocument();
  });

  it('moves on to the result with two pieces', async () => {
    const user = userEvent.setup();
    renderWith([
      { slot: 'top', hex: cream },
      { slot: 'bottom', hex: rust, read: rust },
    ]);
    await user.click(await screen.findByRole('button', { name: CHECK_IT }));
    expect(await screen.findByText('/check/result')).toBeInTheDocument();
  });
});
