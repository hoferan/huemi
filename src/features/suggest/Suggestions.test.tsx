import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { colorName } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { advance, composeOutfit } from '../../session/select';
import { SessionProvider } from '../../session/SessionProvider';
import type { Base, SessionAction, SessionState } from '../../session/types';
import { useSession } from '../../session/useSession';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { OutfitsProvider } from '../saved/OutfitsProvider';
import { fakeOutfitStore } from '../saved/testing';
import { Suggestions } from './Suggestions';

function Where() {
  const { pathname } = useLocation();
  return <p>{`at ${pathname}`}</p>;
}

// Awaits the provider's first load before returning, the way `SaveToggle`'s
// own tests do. Without this, its `list()` promise settles after the test
// body has already made its assertions, outside of `act()`.
async function at(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <InitialLocationContext value={true}>
        <SessionProvider>
          <OutfitsProvider store={fakeOutfitStore()}>
            <Announcer>
              <Routes>
                <Route path="/suggest" element={<Suggestions />} />
                <Route path="/" element={<Where />} />
              </Routes>
            </Announcer>
          </OutfitsProvider>
        </SessionProvider>
      </InitialLocationContext>
    </MemoryRouter>,
  );
  await act(async () => {});
}

/**
 * Runs some session history before the screen mounts, and holds the screen
 * back until it has landed. Every route into `/suggest` works this way: the
 * picker dispatches `baseChosen` and then navigates, and a back navigation
 * from a later screen arrives on a session that already holds picks. A test
 * that renders a fresh provider at the URL sees neither.
 *
 * Readiness is read off the session rather than kept in a flag of its own,
 * which would be a `setState` inside an effect and a cascading render.
 */
function Primed({
  actions,
  landed,
  children,
}: {
  actions: SessionAction[];
  landed: (state: SessionState) => boolean;
  children: ReactNode;
}) {
  const { state, dispatch } = useSession();
  const ready = landed(state);
  useEffect(() => {
    if (ready) return;
    for (const action of actions) dispatch(action);
  }, [actions, dispatch, ready]);
  return ready ? children : null;
}

async function arrivingWith(
  actions: SessionAction[],
  landed: (state: SessionState) => boolean,
  url: string,
) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <InitialLocationContext value={true}>
        <SessionProvider>
          <OutfitsProvider store={fakeOutfitStore()}>
            <Announcer>
              <Primed actions={actions} landed={landed}>
                <Routes>
                  <Route path="/suggest" element={<Suggestions />} />
                  <Route path="/" element={<Where />} />
                </Routes>
              </Primed>
            </Announcer>
          </OutfitsProvider>
        </SessionProvider>
      </InitialLocationContext>
    </MemoryRouter>,
  );
  await act(async () => {});
}

const TOP = '/suggest?slot=top&hex=%23c39a3a';
const MUSTARD: Base = { slot: 'top', hex: '#c39a3a' as Hex };
const CHOSE_MUSTARD: SessionAction = { type: 'baseChosen', ...MUSTARD };

describe('Suggestions', () => {
  it('sends a visitor with no usable base back to the entry screen', async () => {
    await at('/suggest');
    expect(screen.getByText('at /')).toBeInTheDocument();
  });

  it('shows a block for every slot', async () => {
    await at(TOP);
    expect(screen.getAllByRole('group')).toHaveLength(5);
  });

  // The only in-app route onto this screen. The picker dispatches the base and
  // then navigates, so the session's base already matches the URL while its
  // picks are still the empty set `baseChosen` reset them to. Comparing the
  // base alone read that as settled and never seeded, and every non-base block
  // returned null: the screen arrived empty by the one path a user takes.
  it('seeds when the base was dispatched before the screen mounted', async () => {
    await arrivingWith([CHOSE_MUSTARD], (state) => state.base !== null, TOP);
    expect(screen.getAllByRole('group')).toHaveLength(5);
  });

  // The other half of the same rule. Seeding on an empty non-base set must not
  // turn into seeding on every mount, or a back navigation would wipe out the
  // choices the user came back to look at.
  it('keeps a slot the user already moved when the screen mounts again', async () => {
    const seeded = composeOutfit(MUSTARD, {}, () => 0);
    const moved = advance(MUSTARD, 'shoes', 0, 6);
    await arrivingWith(
      [
        CHOSE_MUSTARD,
        { type: 'picksReplaced', picks: seeded },
        { type: 'pickChanged', slot: 'shoes', hex: moved.hex, cursor: moved.cursor },
      ],
      (state) => state.picks.shoes?.hex === moved.hex,
      TOP,
    );
    expect(screen.getByRole('group', { name: /^Shoes:/ }).getAttribute('aria-label')).toContain(
      colorName(moved.hex),
    );
  });

  it('shows the base as its own colour, with no controls on it', async () => {
    await at(TOP);
    const base = screen.getByRole('group', { name: /^Top:/ });
    expect(base).toBeInTheDocument();
    expect(base.querySelectorAll('button')).toHaveLength(0);
  });

  it('gives every other slot a suggestion with its three controls', async () => {
    await at(TOP);
    for (const label of ['Outerwear', 'Bottom', 'Shoes', 'Accessory']) {
      expect(screen.getByRole('button', { name: `Next suggestion for ${label}` })).toBeEnabled();
      expect(screen.getByRole('button', { name: `Keep ${label}` })).toBeInTheDocument();
    }
  });

  it('never shows one colour name twice', async () => {
    await at(TOP);
    const names = screen
      .getAllByRole('group')
      .map((group) => group.getAttribute('aria-label')!.split(': ')[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('advances one slot without touching the others', async () => {
    const user = userEvent.setup();
    await at(TOP);
    const before = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    await user.click(screen.getByRole('button', { name: 'Next suggestion for Shoes' }));
    const after = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    const moved = before.filter((label, index) => label !== after[index]);
    expect(moved).toHaveLength(1);
  });

  it('keeps a slot and stops it advancing', async () => {
    const user = userEvent.setup();
    await at(TOP);
    await user.click(screen.getByRole('button', { name: 'Keep Shoes' }));
    expect(screen.getByRole('button', { name: 'Keep Shoes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Next suggestion for Shoes' })).toBeDisabled();
  });
});

describe('Suggestions: shuffle', () => {
  // Shuffle is random, so one press can land on the outfit already showing.
  // Three presses makes that coincidence vanishingly unlikely without making
  // the test assert something weaker than "shuffle changes the outfit".
  it('changes the unlocked slots', async () => {
    const user = userEvent.setup();
    await at(TOP);
    const labels = () => screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'));
    const before = labels();
    let changed = false;
    for (let press = 0; press < 3 && !changed; press += 1) {
      await user.click(screen.getByRole('button', { name: /^Shuffle/ }));
      changed = JSON.stringify(labels()) !== JSON.stringify(before);
    }
    expect(changed).toBe(true);
  });

  it('leaves the base alone', async () => {
    const user = userEvent.setup();
    await at(TOP);
    const base = () => screen.getByRole('group', { name: /^Top:/ }).getAttribute('aria-label');
    const before = base();
    await user.click(screen.getByRole('button', { name: /^Shuffle/ }));
    expect(base()).toBe(before);
  });

  it('leaves a kept slot alone and says so on the button', async () => {
    const user = userEvent.setup();
    await at(TOP);
    await user.click(screen.getByRole('button', { name: 'Keep Shoes' }));
    const kept = () => screen.getByRole('group', { name: /^Shoes:/ }).getAttribute('aria-label');
    const before = kept();
    await user.click(screen.getByRole('button', { name: 'Shuffle the rest' }));
    expect(kept()).toBe(before);
  });

  // The blocks change with no focus move, so a screen reader is told nothing
  // unless the live region says it. Naming the colours rather than saying
  // "Shuffled" also means an outfit that came back the same reads as the same.
  it('announces what the outfit became', async () => {
    const user = userEvent.setup();
    await at(TOP);
    await user.click(screen.getByRole('button', { name: /^Shuffle/ }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Outerwear/);
    expect(status).toHaveTextContent(/Accessory/);
  });

  it('says why nothing happened when every piece is kept', async () => {
    const user = userEvent.setup();
    await at(TOP);
    for (const label of ['Outerwear', 'Bottom', 'Shoes', 'Accessory']) {
      await user.click(screen.getByRole('button', { name: `Keep ${label}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Shuffle the rest' }));
    expect(screen.getByRole('status')).toHaveTextContent(/every piece is kept/i);
  });

  it('teaches the gestures until something is kept', async () => {
    const user = userEvent.setup();
    await at(TOP);
    expect(screen.getByText(/hold one to keep it/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep Shoes' }));
    expect(screen.getByText(/Kept pieces stay when you shuffle/i)).toBeInTheDocument();
  });
});

describe('Suggestions: alternatives', () => {
  it('opens a sheet for the slot whose colour was tapped', async () => {
    const user = userEvent.setup();
    await at(TOP);
    await user.click(screen.getByRole('button', { name: /^Shoes, / }));
    expect(screen.getByRole('dialog', { name: /Shoes/ })).toBeInTheDocument();
  });

  it('applies the colour chosen there', async () => {
    const user = userEvent.setup();
    await at(TOP);
    await user.click(screen.getByRole('button', { name: /^Shoes, / }));
    const dialog = screen.getByRole('dialog');
    const options = within(dialog).getAllByRole('button');
    const chosen = options[5]!.getAttribute('aria-label')!;
    await user.click(options[5]!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^Shoes:/ }).getAttribute('aria-label')).toContain(
      chosen.split(',')[0],
    );
  });

  // The reducer drops a pickChanged for a locked slot, so without releasing
  // the lock a deliberate choice would silently do nothing. Keep means "leave
  // this alone while I shuffle the rest"; naming a colour is a stronger
  // instruction than that.
  it('releases the lock when a kept slot is given a colour', async () => {
    const user = userEvent.setup();
    await at(TOP);
    await user.click(screen.getByRole('button', { name: 'Keep Shoes' }));
    await user.click(screen.getByRole('button', { name: /^Shoes, / }));
    const options = within(screen.getByRole('dialog')).getAllByRole('button');
    const chosen = options[5]!.getAttribute('aria-label')!;
    await user.click(options[5]!);
    expect(screen.getByRole('button', { name: 'Keep Shoes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // The lock coming off is only half of it, and the half that survives the
    // bug. What makes the dispatch order load-bearing is that `pickChanged`
    // reaches a slot that is no longer locked: reversed, the reducer drops it
    // and the colour never lands, while `aria-pressed` still reads false.
    expect(screen.getByRole('group', { name: /^Shoes:/ }).getAttribute('aria-label')).toContain(
      chosen.split(',')[0],
    );
  });

  // The sheet is unmounted rather than closed with `open={false}`, so focus
  // restoration rides on Radix's FocusScope cleanup running on unmount. If it
  // ever stops, a keyboard user is returned to the document start after every
  // choice, on the screen the brief calls the app's central interaction.
  it('returns focus to the block it was opened from', async () => {
    const user = userEvent.setup();
    await at(TOP);
    await user.click(screen.getByRole('button', { name: /^Shoes, / }));
    const options = within(screen.getByRole('dialog')).getAllByRole('button');
    await user.click(options[5]!);
    // Waited for rather than asserted outright: Radix restores focus from a
    // `setTimeout(0)` in the focus scope's cleanup, working around a React
    // bug about focusing during unmount, so it has not happened yet when the
    // click settles.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Shoes, / })).toHaveFocus();
    });
  });
});
