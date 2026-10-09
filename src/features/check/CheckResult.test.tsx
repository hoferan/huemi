import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../../model/hex';
import type { CheckSlot } from '../../model/types';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { DevSlotContext } from '../../ui/DevSlotContext';
import type { DevSlotRenderer, DevSlots } from '../../ui/devSlots';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { checkOutfit } from '../../color/check';
import { fakeSharePort, type FakeSharePort } from '../share/fakeShare.testing';
import { ShareContext } from '../share/ShareContext';
import { shareText } from '../share/shareText';
import { CheckResult } from './CheckResult';
import { observationText } from './copy';

const charcoal = parseHex('#3d3d3f');
const cream = parseHex('#e9dfc9');
const rust = parseHex('#a4522d');
const burgundy = parseHex('#6b2733');
const navy = parseHex('#1f2a44');

type Seeded = { slot: CheckSlot; hex: Hex };

function Seed({ pieces, start }: { pieces: Seeded[]; start: boolean }) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (start) dispatch({ type: 'checkStarted' });
    for (const piece of pieces) dispatch({ type: 'checkPieceSet', ...piece });
    void navigate('/check/result');
  }, [dispatch, navigate, pieces, start]);
  return null;
}

function Where({ label }: { label: string }) {
  return (
    <p>
      {label} {useLocation().pathname}
    </p>
  );
}

const OUTFIT: Seeded[] = [
  { slot: 'outerwear', hex: charcoal },
  { slot: 'top', hex: cream },
  { slot: 'bottom', hex: rust },
  { slot: 'shoes', hex: burgundy },
];

function renderWith(
  pieces: Seeded[] = OUTFIT,
  start = true,
  port = fakeSharePort(),
  slots: DevSlotRenderer | null = null,
) {
  render(
    <DevSlotContext value={slots}>
      <ShareContext value={port}>
        <MemoryRouter initialEntries={['/seed']}>
          <SessionProvider>
            <Announcer>
              <InitialLocationContext value={false}>
                <Routes>
                  <Route path="/seed" element={<Seed pieces={pieces} start={start} />} />
                  <Route path="/check/result" element={<CheckResult />} />
                  <Route path="/check/pieces" element={<Where label="list" />} />
                  <Route path="/check" element={<Where label="camera" />} />
                </Routes>
              </InitialLocationContext>
            </Announcer>
          </SessionProvider>
        </MemoryRouter>
      </ShareContext>
    </DevSlotContext>,
  );
}

describe('CheckResult', () => {
  it('sends you back to the camera with no check', async () => {
    renderWith([], false);
    expect(await screen.findByText('camera /check')).toBeInTheDocument();
  });

  it('sends you to the list with one piece', async () => {
    renderWith([{ slot: 'top', hex: cream }]);
    expect(await screen.findByText('list /check/pieces')).toBeInTheDocument();
  });

  it('says how it works together, and never scores it', async () => {
    renderWith();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'How it works together' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*(\/|out of)\s*10/)).not.toBeInTheDocument();
  });

  it('shows each piece head to toe as a swap button', async () => {
    renderWith();
    await screen.findByRole('heading', { level: 1 });
    const names = screen
      .getAllByRole('button', { name: /, swap$/ })
      .map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual([
      'Outerwear: Charcoal, swap',
      'Top: Cream, swap',
      'Bottom: Rust, swap',
      'Shoes: Burgundy, swap',
    ]);
  });

  it('lists one sentence per observation', async () => {
    renderWith();
    const list = await screen.findByRole('list', { name: 'How it works together' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Plenty of color, and the rust trousers carry the most.',
      'The colors all sit on the warm side.',
      'The cream top and the charcoal jacket give it clear light and dark.',
    ]);
  });

  it('opens other options for a piece, with yours first', async () => {
    const user = userEvent.setup();
    renderWith();
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust, swap' }));
    const sheet = await screen.findByRole('dialog', { name: 'Other options for Bottom' });
    const tiles = within(sheet).getAllByRole('button', { name: /^(Yours|.+, \d+ of \d+)/ });
    expect(tiles[0]).toHaveAccessibleName('Yours, Rust');
    expect(tiles[0]).toHaveAttribute('aria-current', 'true');
    expect(tiles[1]).toHaveAccessibleName('Brown, 1 of 21');
  });

  it('swaps a piece as a what-if, and its block says so', async () => {
    const user = userEvent.setup();
    renderWith();
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust, swap' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: /^Navy, / }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom: Navy, swapped, swap' })).toBeInTheDocument();
    // Focus lands on the block, whose new name says what changed, so the live
    // region stays quiet rather than saying it twice (ADR 0011).
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('list', { name: 'How it works together' })).toHaveTextContent(
      'Warm and cool together',
    );
  });

  // The engine panel explains the sentences on screen, so it has to be handed
  // the outfit they describe, swaps included.
  it('hands developer mode the swapped outfit the sentences describe', async () => {
    const seen: DevSlots['check.overlay'][] = [];
    const recorder: DevSlotRenderer = (name, context) => {
      if (name === 'check.overlay') seen.push(context as DevSlots['check.overlay']);
      return null;
    };
    const user = userEvent.setup();
    renderWith(OUTFIT, true, fakeSharePort(), recorder);
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust, swap' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /^Navy, / }),
    );
    const last = seen.at(-1)!;
    expect(last.pieces.bottom).toBe(navy);
    expect(last.observations).toEqual(checkOutfit(last.pieces));
  });

  it('gives focus back to the block', async () => {
    const user = userEvent.setup();
    renderWith();
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust, swap' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /^Navy, / }),
    );
    expect(screen.getByRole('button', { name: 'Bottom: Navy, swapped, swap' })).toHaveFocus();
  });

  it('puts a piece back with yours', async () => {
    const user = userEvent.setup();
    renderWith();
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust, swap' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /^Navy, / }),
    );
    await user.click(screen.getByRole('button', { name: 'Bottom: Navy, swapped, swap' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Yours, Rust' }),
    );
    expect(screen.getByRole('button', { name: 'Bottom: Rust, swap' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom: Rust, swap' })).toHaveFocus();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('offers an off-palette piece back as yours', async () => {
    const user = userEvent.setup();
    const red = parseHex('#e0162b');
    renderWith([
      { slot: 'top', hex: red },
      { slot: 'bottom', hex: navy },
    ]);
    await user.click(await screen.findByRole('button', { name: /^Top: .+, swap$/ }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('button', { name: /^Yours, [a-z ]+$/ })).toBeInTheDocument();
  });

  it('goes back to the list to change pieces', async () => {
    const user = userEvent.setup();
    renderWith();
    await user.click(await screen.findByRole('button', { name: 'Change pieces' }));
    expect(await screen.findByText('list /check/pieces')).toBeInTheDocument();
  });

  it('starts another check', async () => {
    const user = userEvent.setup();
    renderWith();
    await user.click(await screen.findByRole('button', { name: 'Check another' }));
    expect(await screen.findByText('camera /check')).toBeInTheDocument();
  });
});

// The screen's parent in the flow, fixed whatever route led here.
describe('CheckResult back arrow', () => {
  it('goes back to What are you wearing?', async () => {
    renderWith();
    expect(
      await screen.findByRole('link', { name: 'Back to What are you wearing?' }),
    ).toHaveAttribute('href', '/check/pieces');
  });
});

describe('CheckResult: sharing', () => {
  const texts = (port: FakeSharePort) =>
    port.calls.render.at(-1)!.flatMap((op) => (op.kind === 'text' ? [op.text] : []));

  it('offers to share the checked outfit', async () => {
    renderWith();
    expect(await screen.findByRole('button', { name: 'Share outfit' })).toBeInTheDocument();
  });

  it('paints the pieces and the sentences on the screen', async () => {
    const port = fakeSharePort();
    renderWith(OUTFIT, true, port);
    await waitFor(() => expect(port.calls.render.length).toBeGreaterThan(0));

    const sentences = checkOutfit({
      outerwear: charcoal,
      top: cream,
      bottom: rust,
      shoes: burgundy,
    })!.map(observationText);
    const painted = texts(port).join(' ');
    for (const sentence of sentences) {
      for (const word of sentence.split(' ')) expect(painted).toContain(word);
    }
    expect(texts(port).some((text) => text.includes('BASE'))).toBe(false);
  });

  it('shares the swapped outfit', async () => {
    const user = userEvent.setup();
    const port = fakeSharePort();
    renderWith(OUTFIT, true, port);
    await user.click(await screen.findByRole('button', { name: 'Bottom: Rust, swap' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: /^Navy, / }));
    await waitFor(() => expect(port.calls.render.length).toBeGreaterThan(1));

    fireEvent.click(screen.getByRole('button', { name: 'Share outfit' }));

    await waitFor(() => expect(port.calls.share).toHaveLength(1));
    const text = port.calls.share[0]!.text!;
    expect(
      text.startsWith(
        shareText({ outerwear: charcoal, top: cream, bottom: navy, shoes: burgundy }),
      ),
    ).toBe(true);
    expect(text).toContain('bottom=1f2a44');
    expect(text).not.toContain('base=');
  });
});
