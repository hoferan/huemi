import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { initialSession, sessionReducer } from './reducer';
import { SessionContext } from './SessionContext';

/**
 * This file lives in `src/session/` rather than `src/app/` because the ESLint
 * zones forbid a feature importing from `app`, and every screen in this
 * milestone reads the session. What issue #13 meant by "no React in it" is
 * that the reducer is a plain data transform, which `reducer.ts`,
 * `select.ts` and `types.ts` still are, now by lint rule rather than by
 * intention.
 *
 * Every screen in this milestone shares the outfit-building session, which is
 * why the prototype holds all of it in one 600-line component. The state
 * itself is a pure reducer in `src/session/`; this is only the React glue.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
