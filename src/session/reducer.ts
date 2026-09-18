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

    case 'reset':
      return { ...initialSession, toastSeq: state.toastSeq };

    default:
      return state;
  }
}
