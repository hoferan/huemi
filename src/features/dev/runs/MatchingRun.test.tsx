import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { colorName } from '../../../color/palette';
import type { PairVote } from '../../../model/field';
import type { FieldStore, StorageResult } from '../../../storage/port';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import { Announcer } from '../../../ui/Announcer';
import { fakeSharePort } from '../../share/fakeShare.testing';
import { ShareContext } from '../../share/ShareContext';
import { fakeFieldStore } from '../field/fieldStore.testing';
import { FieldStoreContext } from '../field/FieldStoreContext';
import { persistFieldSet } from '../field/persist';
import { MatchingRun } from './MatchingRun';
import { drawPairs } from './pairs';

// The helper asks once a page session, so the real one would answer only the
// first test here. Its own test covers what it does with the browser.
vi.mock('../field/persist', () => ({ persistFieldSet: vi.fn() }));

/** A small deterministic generator (mulberry32), so a test knows the pairs the run draws. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 7;
// The pairs the run draws for a length, in the order it asks about them.
const drawn = (length: 10 | 20 | 30) => drawPairs(length, seeded(SEED));

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

function tree(store: FieldStore) {
  return (
    <FieldStoreContext value={store}>
      <ShareContext value={fakeSharePort()}>
        <MemoryRouter initialEntries={['/dev/matching']}>
          <Announcer>
            <SessionProvider>
              <MatchingRun random={seeded(SEED)} />
              <Toast />
            </SessionProvider>
          </Announcer>
        </MemoryRouter>
      </ShareContext>
    </FieldStoreContext>
  );
}

function setup(store: FieldStore = fakeFieldStore()) {
  render(tree(store));
  return { user: userEvent.setup(), store };
}

type User = ReturnType<typeof userEvent.setup>;

async function start(user: User, length = '20') {
  await user.click(screen.getByRole('button', { name: length }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
}

function value<T>(result: StorageResult<T>): T {
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

async function saved(store: FieldStore, n = 1): Promise<PairVote[]> {
  let votes: PairVote[] = [];
  await waitFor(async () => {
    votes = value(await store.listVotes());
    expect(votes).toHaveLength(n);
  });
  return votes;
}

/** Answers the pair on screen Yes, and waits for the next one. */
async function yes(user: User, next: string) {
  await user.click(screen.getByRole('button', { name: 'Yes' }));
  await screen.findByText(next);
}

/** Answers No, takes the bottom block, and gives up on the replacement. */
async function noAndSkip(user: User, bottom: string, next: string) {
  await user.click(screen.getByRole('button', { name: 'No' }));
  await user.click(await screen.findByRole('button', { name: bottom }));
  await user.click(await screen.findByRole('button', { name: 'Skip' }));
  await screen.findByText(next);
}

beforeEach(() => {
  vi.mocked(persistFieldSet).mockClear();
});

describe('MatchingRun', () => {
  it('asks only for the length first', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Rate color pairs' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Number of questions' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Light' })).not.toBeInTheDocument();
  });

  it('shows the pair with both color names, and the question', async () => {
    const { user } = setup();
    await start(user);
    const [pair] = drawn(20);
    expect(colorName(pair!.top)).not.toBe(colorName(pair!.bottom));
    const card = screen.getByRole('group', { name: 'Would you wear these together?' });
    expect(within(card).getByText(colorName(pair!.top))).toBeInTheDocument();
    expect(within(card).getByText(colorName(pair!.bottom))).toBeInTheDocument();
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
  });

  it('saves a Yes with the pair drawn and nothing changed', async () => {
    const { user, store } = setup();
    await start(user);
    const [pair] = drawn(20);
    expect(persistFieldSet).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    const [vote] = await saved(store);
    expect(vote).toMatchObject({
      top: pair!.top,
      bottom: pair!.bottom,
      liked: true,
      changed: null,
      replacement: null,
      offered: [],
      noneWorks: false,
    });
    expect(vote!.build).not.toBe('');
    expect(Number.isNaN(Date.parse(vote!.takenAt))).toBe(false);
    expect(persistFieldSet).toHaveBeenCalled();
    expect(await screen.findByText('2 of 20')).toBeInTheDocument();
  });

  it('saves a No, the bottom block and a swatch with all six offered', async () => {
    const { user, store } = setup();
    await start(user);
    const [pair] = drawn(20);
    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Which one would you change?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: colorName(pair!.bottom) }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pick a better one' }),
    ).toBeInTheDocument();
    const swatches = within(screen.getByRole('group', { name: 'Better colors' })).getAllByRole(
      'button',
    );
    expect(swatches).toHaveLength(6);
    const shown = swatches.map((swatch) => swatch.textContent);
    await user.click(swatches[2]!);
    const [vote] = await saved(store);
    expect(vote).toMatchObject({
      top: pair!.top,
      bottom: pair!.bottom,
      liked: false,
      changed: 'bottom',
      noneWorks: false,
    });
    expect(vote!.offered).toHaveLength(6);
    expect(vote!.offered.map(colorName)).toEqual(shown);
    expect(vote!.replacement).toBe(vote!.offered[2]);
    expect(await screen.findByText('2 of 20')).toBeInTheDocument();
  });

  it('keeps the other block on screen and leaves the replaced one out of the swatches', async () => {
    const { user } = setup();
    await start(user);
    const [pair] = drawn(20);
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: colorName(pair!.top) }));
    expect(screen.getByText(colorName(pair!.bottom))).toBeInTheDocument();
    const swatches = within(screen.getByRole('group', { name: 'Better colors' }));
    expect(swatches.queryByText(colorName(pair!.top))).not.toBeInTheDocument();
  });

  it('saves "Nothing works with it" with no replacement', async () => {
    const { user, store } = setup();
    await start(user);
    const [pair] = drawn(20);
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: colorName(pair!.top) }));
    await user.click(screen.getByRole('button', { name: 'Nothing works with it' }));
    const [vote] = await saved(store);
    expect(vote).toMatchObject({
      liked: false,
      changed: 'top',
      replacement: null,
      noneWorks: true,
    });
    expect(vote!.offered).toHaveLength(6);
  });

  it('stays on the replacement when "Nothing works with it" cannot be saved', async () => {
    const { user } = setup(fakeFieldStore({ failing: true }));
    await start(user);
    const [pair] = drawn(20);
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: colorName(pair!.top) }));
    await user.click(screen.getByRole('button', { name: 'Nothing works with it' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't record this answer."),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pick a better one' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nothing works with it' })).toBeEnabled();
  });

  it('goes back from which and from replace to the pair, saving nothing', async () => {
    const { user, store } = setup();
    await start(user);
    const [pair] = drawn(20);
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Would you wear these together?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: colorName(pair!.bottom) }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Would you wear these together?')).toBeInTheDocument();
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
    expect(await saved(store, 0)).toEqual([]);
  });

  it('saves a Skip as a No with the block named and no replacement', async () => {
    const { user, store } = setup();
    await start(user);
    const [pair] = drawn(20);
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: colorName(pair!.bottom) }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    const [vote] = await saved(store);
    expect(vote).toMatchObject({
      liked: false,
      changed: 'bottom',
      replacement: null,
      noneWorks: false,
    });
  });

  it('takes back the last vote, deleting it and asking the same pair again', async () => {
    const inner = fakeFieldStore();
    const deleteVote = vi.fn((id: string) => inner.deleteVote(id));
    const { user, store } = setup({ ...inner, deleteVote });
    await start(user);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    const [first] = drawn(20);
    await yes(user, '2 of 20');
    const [vote] = await saved(store);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('1 of 20')).toBeInTheDocument();
    expect(deleteVote).toHaveBeenCalledWith(vote!.id);
    expect(value(await store.listVotes())).toEqual([]);
    expect(screen.getByText(colorName(first!.top))).toBeInTheDocument();
  });

  it('stays put when the undo cannot delete', async () => {
    const inner = fakeFieldStore();
    const store: FieldStore = {
      ...inner,
      deleteVote: () => Promise.resolve({ ok: false, reason: 'test' }),
    };
    const { user } = setup(store);
    await start(user);
    await yes(user, '2 of 20');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't take that answer back."),
    );
    expect(screen.getByText('2 of 20')).toBeInTheDocument();
    expect(value(await store.listVotes())).toHaveLength(1);
  });

  it('saves one vote for two quick Yes taps', async () => {
    const { user, store } = setup();
    await start(user);
    const button = screen.getByRole('button', { name: 'Yes' });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText('2 of 20');
    await saved(store);
  });

  it('stays on the pair when the save fails', async () => {
    const { user } = setup(fakeFieldStore({ failing: true }));
    await start(user);
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't record this answer."),
    );
    expect(screen.getByRole('group', { name: 'Would you wear these together?' })).toBeVisible();
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
  });

  it('stays on the replacement when the save fails, so it can be tried again', async () => {
    const { user } = setup(fakeFieldStore({ failing: true }));
    await start(user);
    const [pair] = drawn(20);
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: colorName(pair!.bottom) }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't record this answer."),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pick a better one' }),
    ).toBeInTheDocument();
  });

  // Twenty pairs through the screen take a couple of seconds here, too close
  // to the default five on a busy CI runner.
  it(
    'sums up the run with the pairs liked, and takes back the last vote from there',
    { timeout: 15_000 },
    async () => {
      const { user, store } = setup();
      await start(user);
      const pairs = drawn(20);
      for (let n = 0; n < 12; n++) await yes(user, `${n + 2} of 20`);
      for (let n = 12; n < 19; n++) {
        await noAndSkip(user, colorName(pairs[n]!.bottom), `${n + 2} of 20`);
      }
      // The last pair ends the run.
      await user.click(screen.getByRole('button', { name: 'No' }));
      await user.click(screen.getByRole('button', { name: colorName(pairs[19]!.bottom) }));
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      expect(await screen.findByText('You liked 12 of 20')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Undo' }));
      expect(
        await screen.findByRole('group', { name: 'Would you wear these together?' }),
      ).toBeInTheDocument();
      expect(screen.getByText('20 of 20')).toBeInTheDocument();
      expect(value(await store.listVotes())).toHaveLength(19);
    },
  );

  it('starts another run from the summary', { timeout: 15_000 }, async () => {
    const { user } = setup();
    await start(user, '10');
    for (let n = 0; n < 9; n++) await yes(user, `${n + 2} of 10`);
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('You liked 10 of 10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Another run' }));
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('holds Undo and Another run while the export builds', { timeout: 15_000 }, async () => {
    const inner = fakeFieldStore();
    // Holds the set's reads until released, so the build stays in progress.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store: FieldStore = {
      ...inner,
      listVotes: async () => {
        await held;
        return inner.listVotes();
      },
    };
    const { user } = setup(store);
    await start(user, '10');
    for (let n = 0; n < 9; n++) await yes(user, `${n + 2} of 10`);
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(await screen.findByRole('button', { name: 'Export' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Another run' })).toBeDisabled();
    release();
    expect(await screen.findByRole('button', { name: 'Share the export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });
});
