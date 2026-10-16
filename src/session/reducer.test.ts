import { describe, expect, it } from 'vitest';
import type { Frame } from '../model/frame';
import type { Outfit } from '../model/types';
import { parseHex } from '../model/hex';
import { FULL_SHAPE } from '../model/shape';
import { initialSession, sessionReducer } from './reducer';

const navy = parseHex('#1f2a44');
const cream = parseHex('#e9dfc9');

const OUTFIT: Outfit = {
  version: 1,
  id: 'abc',
  name: 'Navy bottom',
  createdAt: '2026-09-23T10:00:00.000Z',
  baseSlot: 'bottom',
  pieces: { bottom: navy, top: cream },
};

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
      shape: FULL_SHAPE,
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
      shape: FULL_SHAPE,
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
      message: 'Deleted Navy bottom',
      action: { label: 'Undo', kind: 'undoDelete', outfits: [OUTFIT] },
    });
    expect(next.toast?.action).toEqual({ label: 'Undo', kind: 'undoDelete', outfits: [OUTFIT] });
  });

  // Delete moves focus to Undo because the button that had focus is gone. The
  // request travels with the toast so the host can act on it once it renders.
  it('carries a request to focus the action', () => {
    const next = sessionReducer(based, {
      type: 'toastShown',
      message: 'Deleted Navy bottom',
      action: { label: 'Undo', kind: 'undoDelete', outfits: [OUTFIT] },
      focusAction: true,
    });
    expect(next.toast?.focusAction).toBe(true);
  });

  it('leaves the focus request off a toast that did not ask for it', () => {
    const next = sessionReducer(based, { type: 'toastShown', message: 'Saved' });
    expect(next.toast).toEqual({ id: 1, message: 'Saved' });
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
      shape: FULL_SHAPE,
      base: { slot: 'top', hex: cream },
      picks: {},
    });
    expect(next.toast).toBeNull();
  });

  describe('shape', () => {
    const base = { slot: 'top', hex: parseHex('#c39a3a') } as const;
    const grey = { hex: parseHex('#8a8a8a'), cursor: 0 };
    const camel = { hex: parseHex('#b58a5a'), cursor: 3 };
    const noAccessory = { outerwear: true, accessory: false, dress: false };

    function full() {
      let state = sessionReducer(initialSession, { type: 'baseChosen', ...base });
      state = sessionReducer(state, {
        type: 'outfitSeeded',
        shape: FULL_SHAPE,
        picks: { outerwear: grey, accessory: camel },
      });
      state = sessionReducer(state, { type: 'lockToggled', slot: 'accessory' });
      return sessionReducer(state, { type: 'lockToggled', slot: 'outerwear' });
    }

    it('has no shape until an outfit is composed for the base', () => {
      expect(sessionReducer(initialSession, { type: 'baseChosen', ...base }).shape).toBeNull();
      expect(full().shape).toEqual(FULL_SHAPE);
      expect(full().picks.outerwear).toEqual(grey);
    });

    it('drops the pick and the lock of a piece the new shape leaves out', () => {
      const state = sessionReducer(full(), { type: 'shapeChanged', shape: noAccessory, picks: {} });
      expect(state.shape).toEqual(noAccessory);
      expect(state.picks.accessory).toBeUndefined();
      expect(state.locked.accessory).toBeUndefined();
      expect(state.picks.outerwear).toEqual(grey);
      expect(state.locked.outerwear).toBe(true);
    });

    it('brings a piece back unlocked', () => {
      let state = sessionReducer(full(), { type: 'shapeChanged', shape: noAccessory, picks: {} });
      state = sessionReducer(state, {
        type: 'shapeChanged',
        shape: FULL_SHAPE,
        picks: { accessory: camel },
      });
      expect(state.picks.accessory).toEqual(camel);
      expect(state.locked.accessory).toBeUndefined();
    });

    it('ignores a pick for a piece the new shape does not wear', () => {
      const state = sessionReducer(full(), {
        type: 'shapeChanged',
        shape: noAccessory,
        picks: { accessory: camel },
      });
      expect(state.picks.accessory).toBeUndefined();
    });

    it('trades the top and the bottom, locks and all, for a dress', () => {
      const shoesBase = { slot: 'shoes', hex: parseHex('#c9ad86') } as const;
      let state = sessionReducer(initialSession, { type: 'baseChosen', ...shoesBase });
      state = sessionReducer(state, {
        type: 'outfitSeeded',
        shape: FULL_SHAPE,
        picks: { top: grey, bottom: camel, outerwear: grey },
      });
      state = sessionReducer(state, { type: 'lockToggled', slot: 'top' });
      const rust = { hex: parseHex('#a4522d'), cursor: 0 };
      state = sessionReducer(state, {
        type: 'shapeChanged',
        shape: { ...FULL_SHAPE, dress: true },
        picks: { dress: rust },
      });
      expect(state.picks.top).toBeUndefined();
      expect(state.picks.bottom).toBeUndefined();
      expect(state.locked.top).toBeUndefined();
      expect(state.picks.dress).toEqual(rust);
      expect(state.picks.outerwear).toEqual(grey);
    });

    it('keeps the shape of a loaded outfit', () => {
      const state = sessionReducer(initialSession, {
        type: 'outfitLoaded',
        base: { slot: 'bottom', hex: navy },
        shape: noAccessory,
        picks: {},
      });
      expect(state.shape).toEqual(noAccessory);
    });
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

  const frame = {
    pixels: { width: 1, height: 1, data: new Uint8ClampedArray([31, 42, 68, 255]) },
    source: 'camera' as const,
  };

  it('holds a captured frame and the slot it is for', () => {
    const next = sessionReducer(initialSession, {
      type: 'frameCaptured',
      slot: 'bottom',
      frame,
      lowLight: false,
    });
    expect(next.capture).toEqual({ slot: 'bottom', frame, lowLight: false });
  });

  it('frameCaptured stores lowLight', () => {
    const dark = sessionReducer(initialSession, {
      type: 'frameCaptured',
      slot: 'top',
      frame,
      lowLight: true,
    });
    expect(dark.capture?.lowLight).toBe(true);
    const photo = sessionReducer(initialSession, {
      type: 'frameCaptured',
      slot: 'top',
      frame,
      lowLight: null,
    });
    expect(photo.capture?.lowLight).toBeNull();
  });

  it('replaces an earlier capture rather than keeping both', () => {
    const first = sessionReducer(initialSession, {
      type: 'frameCaptured',
      slot: 'top',
      frame,
      lowLight: false,
    });
    const second = sessionReducer(first, {
      type: 'frameCaptured',
      slot: 'shoes',
      frame,
      lowLight: false,
    });
    expect(second.capture?.slot).toBe('shoes');
  });

  it('starts with no capture', () => {
    expect(initialSession.capture).toBeNull();
  });

  describe('check', () => {
    const rust = parseHex('#a4522d');
    const frame: Frame = {
      pixels: { width: 1, height: 1, data: new Uint8ClampedArray(4) },
      source: 'camera',
    };

    it('starts empty and is cleared by reset', () => {
      expect(initialSession.check).toBeNull();
      const started = sessionReducer(initialSession, { type: 'checkStarted' });
      expect(started.check).toEqual({ photo: null, pieces: {}, swaps: {}, dress: false });
      expect(sessionReducer(started, { type: 'reset' }).check).toBeNull();
    });

    it('starts over when a check is started again', () => {
      const withPiece = sessionReducer(sessionReducer(initialSession, { type: 'checkStarted' }), {
        type: 'checkPieceSet',
        slot: 'top',
        hex: cream,
      });
      expect(sessionReducer(withPiece, { type: 'checkStarted' }).check).toEqual({
        photo: null,
        pieces: {},
        swaps: {},
        dress: false,
      });
    });

    it('keeps the photo and empties the pieces when a photo is taken', () => {
      const withPiece = sessionReducer(initialSession, {
        type: 'checkPieceSet',
        slot: 'top',
        hex: cream,
      });
      const next = sessionReducer(withPiece, { type: 'checkPhotoTaken', frame });
      expect(next.check).toEqual({ photo: frame, pieces: {}, swaps: {}, dress: false });
    });

    it('creates the record when a piece is set with none there', () => {
      const next = sessionReducer(initialSession, {
        type: 'checkPieceSet',
        slot: 'shoes',
        hex: navy,
      });
      expect(next.check).toEqual({
        photo: null,
        pieces: { shoes: { hex: navy } },
        swaps: {},
        dress: false,
      });
    });

    describe('dress', () => {
      it('wears a dress, and keeps the top and the bottom for a change of mind', () => {
        const withTop = sessionReducer(initialSession, {
          type: 'checkPieceSet',
          slot: 'top',
          hex: cream,
        });
        const dressed = sessionReducer(withTop, { type: 'checkDressChosen', dress: true });
        expect(dressed.check?.dress).toBe(true);
        expect(dressed.check?.pieces.top).toEqual({ hex: cream });
        const back = sessionReducer(dressed, { type: 'checkDressChosen', dress: false });
        expect(back.check?.dress).toBe(false);
        expect(back.check?.pieces.top).toEqual({ hex: cream });
      });

      it('creates the record when the choice comes with none there', () => {
        const next = sessionReducer(initialSession, { type: 'checkDressChosen', dress: true });
        expect(next.check).toEqual({ photo: null, pieces: {}, swaps: {}, dress: true });
      });

      it('starts a new photo without a dress', () => {
        const dressed = sessionReducer(initialSession, { type: 'checkDressChosen', dress: true });
        expect(sessionReducer(dressed, { type: 'checkPhotoTaken', frame }).check?.dress).toBe(
          false,
        );
      });
    });

    describe('swaps', () => {
      const withPieces = [
        { type: 'checkStarted' } as const,
        { type: 'checkPieceSet', slot: 'top', hex: navy } as const,
        { type: 'checkPieceSet', slot: 'bottom', hex: rust } as const,
      ].reduce(sessionReducer, initialSession);

      it('lays a swap over a piece without changing the piece', () => {
        const swapped = sessionReducer(withPieces, {
          type: 'checkSwapped',
          slot: 'top',
          hex: rust,
        });
        expect(swapped.check?.swaps).toEqual({ top: rust });
        expect(swapped.check?.pieces.top).toEqual({ hex: navy });
      });

      it('clears a swap', () => {
        const swapped = sessionReducer(withPieces, {
          type: 'checkSwapped',
          slot: 'top',
          hex: rust,
        });
        const cleared = sessionReducer(swapped, { type: 'checkSwapCleared', slot: 'top' });
        expect(cleared.check?.swaps).toEqual({});
      });

      it('a swap to the worn color is no swap', () => {
        const swapped = sessionReducer(withPieces, {
          type: 'checkSwapped',
          slot: 'top',
          hex: rust,
        });
        const back = sessionReducer(swapped, { type: 'checkSwapped', slot: 'top', hex: navy });
        expect(back.check?.swaps).toEqual({});
      });

      it('ignores a swap for a slot with no piece, or with no check', () => {
        expect(
          sessionReducer(withPieces, { type: 'checkSwapped', slot: 'shoes', hex: rust }).check
            ?.swaps,
        ).toEqual({});
        expect(
          sessionReducer(initialSession, { type: 'checkSwapped', slot: 'top', hex: rust }),
        ).toBe(initialSession);
        expect(sessionReducer(initialSession, { type: 'checkSwapCleared', slot: 'top' })).toBe(
          initialSession,
        );
      });

      it('keeps a swap when the list sets the same color again', () => {
        const swapped = sessionReducer(withPieces, {
          type: 'checkSwapped',
          slot: 'top',
          hex: rust,
        });
        const same = sessionReducer(swapped, { type: 'checkPieceSet', slot: 'top', hex: navy });
        expect(same.check?.swaps).toEqual({ top: rust });
      });

      it("drops a slot's swap when its piece changes or is cleared", () => {
        const swapped = [
          { type: 'checkSwapped', slot: 'top', hex: rust } as const,
          { type: 'checkSwapped', slot: 'bottom', hex: navy } as const,
        ].reduce(sessionReducer, withPieces);
        const changed = sessionReducer(swapped, { type: 'checkPieceSet', slot: 'top', hex: rust });
        expect(changed.check?.swaps).toEqual({ bottom: navy });
        const cleared = sessionReducer(swapped, { type: 'checkPieceCleared', slot: 'bottom' });
        expect(cleared.check?.swaps).toEqual({ top: rust });
      });

      it('starts a new check, or a new photo, with no swaps', () => {
        const swapped = sessionReducer(withPieces, {
          type: 'checkSwapped',
          slot: 'top',
          hex: rust,
        });
        expect(sessionReducer(swapped, { type: 'checkStarted' }).check?.swaps).toEqual({});
        expect(sessionReducer(swapped, { type: 'checkPhotoTaken', frame }).check?.swaps).toEqual(
          {},
        );
      });
    });

    it('clears a piece, and ignores a clear with no check', () => {
      const withPiece = sessionReducer(initialSession, {
        type: 'checkPieceSet',
        slot: 'top',
        hex: cream,
      });
      expect(
        sessionReducer(withPiece, { type: 'checkPieceCleared', slot: 'top' }).check?.pieces,
      ).toEqual({});
      expect(sessionReducer(initialSession, { type: 'checkPieceCleared', slot: 'top' })).toBe(
        initialSession,
      );
    });

    // Checking an outfit and building suggestions are separate sessions.
    it('survives a new base, and leaves the base alone', () => {
      const checked = sessionReducer(initialSession, {
        type: 'checkPieceSet',
        slot: 'top',
        hex: cream,
      });
      const based = sessionReducer(checked, { type: 'baseChosen', slot: 'bottom', hex: navy });
      expect(based.check).toEqual(checked.check);
      expect(sessionReducer(based, { type: 'checkStarted' }).base).toEqual({
        slot: 'bottom',
        hex: navy,
      });
    });
  });
});
