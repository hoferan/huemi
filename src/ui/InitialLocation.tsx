import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { InitialLocationContext } from './InitialLocationContext';
import { isRedirect } from './redirectState';

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
 * A redirect away from the arrival is still the arrival. The onboarding gate
 * sends a first visit from / to /welcome, and a deep link without what its
 * screen needs is sent on the same way. Nobody has moved, so nothing should
 * take focus. A redirect reached any other way, after a tap, is part of that
 * tap's navigation and moves focus like it.
 *
 * This has to sit above `<Routes>`. `Screen` remounts on every route change,
 * so it cannot hold the memory itself.
 *
 * State rather than refs, because both locations are read while rendering and
 * `react-hooks/refs` rejects that. They are updated during render, React's
 * pattern for state derived from the previous render, so the value is right
 * on the render that shows the new screen.
 */
export function InitialLocation({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [arrival, setArrival] = useState(location);
  const [previous, setPrevious] = useState(location);
  const redirectedOnArrival = location !== previous && previous === arrival && isRedirect(location);
  if (location !== previous) {
    setPrevious(location);
    if (redirectedOnArrival) setArrival(location);
  }
  return (
    <InitialLocationContext value={location === arrival || redirectedOnArrival}>
      {children}
    </InitialLocationContext>
  );
}
