import { createContext } from 'react';
import type { Trail } from './historyTrail';

/**
 * The history the app has walked, from `HistoryTrail`.
 *
 * Null with no provider above, which is how screens render under test. A
 * `TrailLink` then opens its destination as a plain link would, which is the
 * behaviour it falls back to anyway when the destination is not behind.
 */
export const HistoryTrailContext = createContext<Trail | null>(null);
