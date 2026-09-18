import type { SessionAction, SessionState } from './types';

export type { SessionAction, SessionState } from './types';

/**
 * The outfit-building session. Pure, and deliberately free of the colour
 * engine: `select.ts` is the join between the two, and features call it and
 * dispatch the result. That keeps this a plain data transform, which is what
 * makes it worth testing exhaustively.
 */
export const initialSession: SessionState = {
  base: null,
  picks: {},
  cursor: {},
  locked: {},
  toast: null,
  toastSeq: 0,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'baseChosen':
      // A new base invalidates every suggestion made against the old one, so
      // picks, cursors and locks all go. The toast sequence survives, because
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
        picks: { ...state.picks, [action.slot]: action.hex },
        cursor: { ...state.cursor, [action.slot]: action.cursor },
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

    case 'reset':
      return { ...initialSession, toastSeq: state.toastSeq };

    default:
      return state;
  }
}
