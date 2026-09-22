import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { initialSession, sessionReducer } from './reducer';

const navy = parseHex('#1f2a44');
const cream = parseHex('#e9dfc9');

describe('sessionReducer', () => {
  it('records the base colour and the slot it came from', () => {
    const next = sessionReducer(initialSession, { type: 'baseChosen', slot: 'bottom', hex: navy });
    expect(next.base).toEqual({ slot: 'bottom', hex: navy });
  });

  it('clears picks and locks when a new base is chosen', () => {
    const withWork = sessionReducer(
      sessionReducer(
        sessionReducer(initialSession, { type: 'baseChosen', slot: 'bottom', hex: navy }),
        { type: 'pickChanged', slot: 'top', hex: cream, cursor: 0 },
      ),
      { type: 'lockToggled', slot: 'top' },
    );
    const next = sessionReducer(withWork, { type: 'baseChosen', slot: 'top', hex: cream });
    expect(next.picks).toEqual({});
    expect(next.locked).toEqual({});
  });

  it('shares the initial picks and locks frozen, so nothing can write into them', () => {
    // Reset and baseChosen hand these same two objects to the next state.
    expect(Object.isFrozen(initialSession.picks)).toBe(true);
    expect(Object.isFrozen(initialSession.locked)).toBe(true);
  });

  it('returns to the initial state on reset', () => {
    const withBase = sessionReducer(initialSession, {
      type: 'baseChosen',
      slot: 'bottom',
      hex: navy,
    });
    expect(sessionReducer(withBase, { type: 'reset' })).toEqual(initialSession);
  });

  const based = sessionReducer(initialSession, { type: 'baseChosen', slot: 'bottom', hex: navy });

  it('records a pick and the cursor it came from', () => {
    const next = sessionReducer(based, { type: 'pickChanged', slot: 'top', hex: cream, cursor: 3 });
    // One record, so the cursor cannot end up describing a colour that is no
    // longer showing. The block announces the position from this pair.
    expect(next.picks.top).toEqual({ hex: cream, cursor: 3 });
  });

  it('ignores a pick for a locked slot', () => {
    const locked = sessionReducer(
      sessionReducer(based, { type: 'pickChanged', slot: 'top', hex: cream, cursor: 0 }),
      { type: 'lockToggled', slot: 'top' },
    );
    const next = sessionReducer(locked, { type: 'pickChanged', slot: 'top', hex: navy, cursor: 1 });
    expect(next).toBe(locked);
  });

  it('locks and unlocks a slot that has a pick', () => {
    const picked = sessionReducer(based, {
      type: 'pickChanged',
      slot: 'shoes',
      hex: cream,
      cursor: 0,
    });
    const locked = sessionReducer(picked, { type: 'lockToggled', slot: 'shoes' });
    expect(locked.locked.shoes).toBe(true);
    expect(
      sessionReducer(locked, { type: 'lockToggled', slot: 'shoes' }).locked.shoes,
    ).toBeUndefined();
  });

  it('ignores a lock on a slot with nothing in it', () => {
    expect(sessionReducer(based, { type: 'lockToggled', slot: 'shoes' })).toBe(based);
  });

  it('replaces the whole session when an outfit is loaded', () => {
    const working = sessionReducer(
      sessionReducer(based, { type: 'pickChanged', slot: 'top', hex: cream, cursor: 2 }),
      { type: 'lockToggled', slot: 'top' },
    );
    // Navy really is the sixteenth of the eighteen suggestions this base
    // makes for the bottom slot, which is what `locate` returns and what the
    // saved screen dispatches. The cursor rides with the hex, so it cannot
    // name some other colour's position for the block to announce.
    const next = sessionReducer(working, {
      type: 'outfitLoaded',
      base: { slot: 'top', hex: cream },
      picks: { bottom: { hex: navy, cursor: 15 } },
    });
    expect(next.base).toEqual({ slot: 'top', hex: cream });
    expect(next.picks).toEqual({ bottom: { hex: navy, cursor: 15 } });
    expect(next.locked).toEqual({});
  });

  it('loads a pick whose position is unknown without inventing one', () => {
    // `locate` returns null for a colour no suggestion list holds, and the
    // caller omits the cursor instead of guessing. exactOptionalPropertyTypes
    // is on, so this is an absent key rather than an explicit undefined.
    const next = sessionReducer(based, {
      type: 'outfitLoaded',
      base: { slot: 'top', hex: cream },
      picks: { bottom: { hex: navy } },
    });
    expect(next.picks.bottom).toEqual({ hex: navy });
    expect(next.picks.bottom && 'cursor' in next.picks.bottom).toBe(false);
  });

  it('gives each toast a new id and keeps only the newest', () => {
    const first = sessionReducer(based, { type: 'toastShown', message: 'Saved' });
    const second = sessionReducer(first, { type: 'toastShown', message: 'Removed' });
    expect(first.toast?.id).toBe(1);
    expect(second.toast).toEqual({ id: 2, message: 'Removed' });
  });

  it('carries a toast action through', () => {
    const next = sessionReducer(based, {
      type: 'toastShown',
      message: 'Outfit removed',
      action: { label: 'Undo', kind: 'undoDelete', outfitId: 'abc' },
    });
    expect(next.toast?.action).toEqual({ label: 'Undo', kind: 'undoDelete', outfitId: 'abc' });
  });

  it('dismisses only the toast it names', () => {
    const first = sessionReducer(based, { type: 'toastShown', message: 'Saved' });
    const second = sessionReducer(first, { type: 'toastShown', message: 'Removed' });
    // The first toast's auto-dismiss timer fires after the second replaced it.
    expect(sessionReducer(second, { type: 'toastDismissed', id: 1 })).toBe(second);
    expect(sessionReducer(second, { type: 'toastDismissed', id: 2 }).toast).toBeNull();
  });

  it('does not reuse a toast id across reset', () => {
    const shown = sessionReducer(based, { type: 'toastShown', message: 'Saved' });
    const afterReset = sessionReducer(shown, { type: 'reset' });
    const rebased = sessionReducer(afterReset, { type: 'baseChosen', slot: 'bottom', hex: navy });
    const shownAgain = sessionReducer(rebased, { type: 'toastShown', message: 'Saved again' });
    expect(shownAgain.toast?.id).toBeGreaterThan(shown.toast?.id ?? -Infinity);
  });

  it('does not reuse a toast id across a new base', () => {
    const shown = sessionReducer(based, { type: 'toastShown', message: 'Saved' });
    const rebased = sessionReducer(shown, { type: 'baseChosen', slot: 'top', hex: cream });
    const shownAgain = sessionReducer(rebased, { type: 'toastShown', message: 'Saved again' });
    expect(shownAgain.toast?.id).toBeGreaterThan(shown.toast?.id ?? -Infinity);
  });

  it('clears the toast when an outfit is loaded', () => {
    const shown = sessionReducer(based, { type: 'toastShown', message: 'Saved' });
    const next = sessionReducer(shown, {
      type: 'outfitLoaded',
      base: { slot: 'top', hex: cream },
      picks: {},
    });
    expect(next.toast).toBeNull();
  });

  describe('picksReplaced', () => {
    const base = { slot: 'top', hex: parseHex('#c39a3a') } as const;

    function seeded() {
      return sessionReducer(initialSession, { type: 'baseChosen', ...base });
    }

    it('sets every slot it is given', () => {
      const picks = {
        shoes: { hex: parseHex('#1f2a44'), cursor: 3 },
        bottom: { hex: parseHex('#8a8a8a'), cursor: 0 },
      };
      const state = sessionReducer(seeded(), { type: 'picksReplaced', picks });
      expect(state.picks.shoes).toEqual(picks.shoes);
      expect(state.picks.bottom).toEqual(picks.bottom);
    });

    it('leaves a locked slot alone', () => {
      const kept = { hex: parseHex('#2f4a3a'), cursor: 1 };
      let state = sessionReducer(seeded(), {
        type: 'picksReplaced',
        picks: { shoes: kept },
      });
      state = sessionReducer(state, { type: 'lockToggled', slot: 'shoes' });
      state = sessionReducer(state, {
        type: 'picksReplaced',
        picks: { shoes: { hex: parseHex('#a4522d'), cursor: 9 } },
      });
      expect(state.picks.shoes).toEqual(kept);
    });

    it('leaves a slot it was not given alone', () => {
      const kept = { hex: parseHex('#2f4a3a'), cursor: 1 };
      let state = sessionReducer(seeded(), { type: 'picksReplaced', picks: { shoes: kept } });
      state = sessionReducer(state, {
        type: 'picksReplaced',
        picks: { bottom: { hex: parseHex('#8a8a8a'), cursor: 0 } },
      });
      expect(state.picks.shoes).toEqual(kept);
    });
  });
});
