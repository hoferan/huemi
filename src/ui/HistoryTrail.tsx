import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router';
import type { Location } from 'react-router';
import { advanceTrail, startTrail } from './trail';
import type { TrailEntry } from './trail';
import { HistoryTrailContext } from './HistoryTrailContext';

function toEntry(location: Location): TrailEntry {
  return { key: location.key, href: location.pathname + location.search };
}

/**
 * Keeps the trail `TrailLink` reads, one step per history update.
 *
 * Above `<Routes>`, for the reason `InitialLocation` is: a screen remounts on
 * every route change and cannot remember the ones before it.
 *
 * The trail is advanced while rendering, by the pattern React documents for
 * state derived from a changing value, rather than in an effect. An effect
 * would run after the new screen had already rendered against the old trail,
 * and its arrow would step back by one entry too few. React Router builds a
 * new location object for each history update and no other time (see
 * `InitialLocation`), so identity is what says an update has happened.
 */
export function HistoryTrail({ children }: { children: ReactNode }) {
  const location = useLocation();
  const type = useNavigationType();
  const [seen, setSeen] = useState(() => ({ location, trail: startTrail(toEntry(location)) }));
  let current = seen;
  if (seen.location !== location) {
    current = { location, trail: advanceTrail(seen.trail, toEntry(location), type) };
    setSeen(current);
  }
  return <HistoryTrailContext value={current.trail}>{children}</HistoryTrailContext>;
}
