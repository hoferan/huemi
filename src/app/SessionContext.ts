import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { SessionAction, SessionState } from '../session/reducer';

export type SessionValue = { state: SessionState; dispatch: Dispatch<SessionAction> };

// Three files rather than one: react-refresh/only-export-components warns when
// a module exports both a component and something else.
export const SessionContext = createContext<SessionValue | null>(null);
