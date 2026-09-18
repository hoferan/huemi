import { createContext } from 'react';

// Three files rather than one, as in src/app/: react-refresh warns when a
// module exports both a component and something else, and a standing warning
// hides the next real one.
export const AnnounceContext = createContext<((message: string) => void) | null>(null);
