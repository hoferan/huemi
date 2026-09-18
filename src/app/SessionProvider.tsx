import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { initialSession, sessionReducer } from '../session/reducer';
import { SessionContext } from './SessionContext';

/**
 * Every screen in this milestone shares the outfit-building session, which is
 * why the prototype holds all of it in one 600-line component. The state
 * itself is a pure reducer in `src/session/`; this is only the React glue.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
