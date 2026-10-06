import { lazy } from 'react';
import { DevOnly } from './DevOnly';

// At module scope so the chunk is requested at most once, and only after the
// mode is on: a locked build never fetches the menu.
const DevMenu = lazy(() => import('./menu/DevMenu'));

/** `/dev`, the developer menu. */
export function DevRoute() {
  return (
    <DevOnly>
      <DevMenu />
    </DevOnly>
  );
}
