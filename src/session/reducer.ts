import type { SessionAction, SessionState } from './types';

export type { Pick, SessionAction, SessionState } from './types';

/**
 * The outfit-building session. Pure, and deliberately free of the colour
 * engine: `select.ts` is the join between the two, and features call it and
 * dispatch the result. That keeps this a plain data transform, which is what
 * makes it worth testing exhaustively.
 */
export const initialSession: SessionState = {
  base: null,
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
      // reusing an id would let a stale dismissal close a live toast.
      return {
        ...initialSession,
        base: { slot: action.slot, hex: action.hex },
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
      const toast =
        action.action === undefined
          ? { id, message: action.message }
          : { id, message: action.message, action: action.action };
      return { ...state, toast, toastSeq: id };
    }

    case 'toastDismissed':
      // A timer from a toast that has already been replaced must not close its
      // successor.
      if (state.toast?.id !== action.id) return state;
      return { ...state, toast: null };

    case 'reset':
      return { ...initialSession, toastSeq: state.toastSeq };

    default: {
      // A new action type that nobody handled is a compile error rather than a
      // silent no-op.
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
