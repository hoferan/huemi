import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { InitialLocationContext } from './InitialLocationContext';

/**
 * Remembers which location the app arrived on, so `Screen` can tell a first
 * load from a return to the same entry.
 *
 * The location key cannot answer that question. React Router derives the key
 * from `history.state`, the first entry of a session has none, and so a POP
 * back to it reports the key `default` a second time. React Router does build
 * a fresh location object for every history update, including that POP, so
 * identity separates the two cases.
 *
 * This has to sit above `<Routes>`. `Screen` remounts on every route change,
 * so it cannot hold the memory itself.
 *
 * State rather than a ref, because the arrival location is read while
 * rendering and `react-hooks/refs` rejects that. The setter is dropped: the
 * value is written once, by the initialiser.
 */
export function InitialLocation({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [arrival] = useState(location);
  return <InitialLocationContext value={location === arrival}>{children}</InitialLocationContext>;
}
