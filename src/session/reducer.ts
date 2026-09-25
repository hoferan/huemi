import type { SessionAction, SessionState, Toast } from './types';
import { SLOTS } from '../model/types';

export type { SlotPick, SessionAction, SessionState } from './types';

/**
 * The outfit-building session. Pure, and deliberately free of the colour
 * engine: `select.ts` is the join between the two, and features call it and
 * dispatch the result. That keeps this a plain data transform, which is what
 * makes it worth testing exhaustively.
 */
export const initialSession: SessionState = {
  base: null,
  capture: null,
  check: null,
  // Frozen because these two objects are shared by reference into every state
  // derived from the initial one, here and through `reset` and `baseChosen`.
  // Every case below replaces them rather than writing into them, and a lapse
  // would corrupt the state every later session starts from. Modules are
  // strict, so an assignment to a frozen object throws where it happens.
  picks: Object.freeze({}),
  locked: Object.freeze({}),
  toast: null,
  toastSeq: 0,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'baseChosen':
      // A new base invalidates every suggestion made against the old one, so
      // picks and locks all go. The toast sequence survives, because
      // reusing an id would let a stale dismissal close a live toast. An
      // outfit check in progress survives too; it is not built on the base.
      return {
        ...initialSession,
        base: { slot: action.slot, hex: action.hex },
        check: state.check,
        toastSeq: state.toastSeq,
      };

    case 'pickChanged': {
      // A locked slot is one the user has said to leave alone. Enforcing that
      // here rather than only at the call site means shuffle cannot race a
      // lock, and it states what the lock means in the one place that owns it.
      if (state.locked[action.slot]) return state;
      return {
        ...state,
        picks: { ...state.picks, [action.slot]: { hex: action.hex, cursor: action.cursor } },
      };
    }

    case 'lockToggled': {
      // Nothing to keep means nothing to lock.
      if (!state.picks[action.slot]) return state;
      const locked = { ...state.locked };
      if (locked[action.slot]) {
        delete locked[action.slot];
      } else {
        locked[action.slot] = true;
      }
      return { ...state, locked };
    }

    case 'outfitLoaded':
      // Locks belong to a session, not to a saved outfit: reopening one starts
      // with everything free to change.
      return {
        ...state,
        base: action.base,
        picks: action.picks,
        locked: {},
        toast: null,
      };

    case 'toastShown': {
      // The id is assigned here rather than by the caller so that a dismissal
      // can name exactly the toast it was scheduled for. Radix Toast queues;
      // this field does not, which is the single-toast rule from the handoff
      // notes.
      const id = state.toastSeq + 1;
      const toast: Toast = { id, message: action.message };
      if (action.action !== undefined) toast.action = action.action;
      if (action.focusAction) toast.focusAction = true;
      return { ...state, toast, toastSeq: id };
    }

    case 'toastDismissed':
      // A timer from a toast that has already been replaced must not close its
      // successor.
      if (state.toast?.id !== action.id) return state;
      return { ...state, toast: null };

    case 'frameCaptured':
      // One capture at a time: a new shot means the last one was not wanted.
      return { ...state, capture: { slot: action.slot, frame: action.frame } };

    case 'checkStarted':
      return { ...state, check: { photo: null, pieces: {} } };

    case 'checkPhotoTaken':
      // A new photo is a different outfit, or the same one framed again:
      // either way, readings from the last photo no longer describe it.
      return { ...state, check: { photo: action.frame, pieces: {} } };

    case 'checkPieceSet': {
      // Created here if missing, since the list can be reached by hand after
      // a refresh has emptied the session.
      const check = state.check ?? { photo: null, pieces: {} };
      // A hand change keeps the photo's reading, so the correction log can
      // compare every later choice with what the camera said.
      const read = action.read ?? check.pieces[action.slot]?.read;
      const piece = read === undefined ? { hex: action.hex } : { hex: action.hex, read };
      return { ...state, check: { ...check, pieces: { ...check.pieces, [action.slot]: piece } } };
    }

    case 'checkPieceCleared': {
      if (!state.check) return state;
      const pieces = { ...state.check.pieces };
      delete pieces[action.slot];
      return { ...state, check: { ...state.check, pieces } };
    }

    case 'reset':
      return { ...initialSession, toastSeq: state.toastSeq };

    case 'picksReplaced': {
      // Seeding and shuffle both change several slots at once. Four
      // `pickChanged` dispatches would do it in four renders, which tears a
      // crossfade that is meant to be simultaneous.
      //
      // The lock is enforced here rather than at the call site for the reason
      // `pickChanged` enforces it here: this is the file that owns what a lock
      // means, and the rule stated twice is the rule that drifts.
      const picks = { ...state.picks };
      for (const slot of SLOTS) {
        const next = action.picks[slot];
        if (!next || state.locked[slot]) continue;
        picks[slot] = next;
      }
      return { ...state, picks };
    }

    /* v8 ignore start */
    default: {
      // A new action type that nobody handled is a compile error rather than a
      // silent no-op, so this branch is unreachable by construction: writing a
      // test for it means writing an action the union forbids. The hint keeps
      // it out of the denominator rather than taxing every change to this file.
      const exhaustive: never = action;
      return exhaustive;
    }
    /* v8 ignore stop */
  }
}
