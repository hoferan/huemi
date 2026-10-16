import { lazy } from 'react';

// One per screen, from the one chunk, at module scope like the field
// recorder's: a `lazy` made during a render would remount its screen on every
// render. The route table wraps each in `DevOnly`.
const screen = () => import('./screens');

export const ReadingRun = lazy(() => screen().then((m) => ({ default: m.ReadingRun })));
export const MatchingRun = lazy(() => screen().then((m) => ({ default: m.MatchingRun })));
