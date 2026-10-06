import { lazy } from 'react';

// One per screen, all from the one chunk. At module scope, since a `lazy` made
// during a render would remount its screen on every render. The route table
// wraps each in `DevOnly`, so none loads with developer mode off.
const screen = () => import('./screens');

export const FieldList = lazy(() => screen().then((m) => ({ default: m.FieldList })));
export const NewGarment = lazy(() => screen().then((m) => ({ default: m.NewGarment })));
export const GarmentPage = lazy(() => screen().then((m) => ({ default: m.GarmentPage })));
export const CaptureGarment = lazy(() => screen().then((m) => ({ default: m.CaptureGarment })));
