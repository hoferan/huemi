import { Suspense, lazy } from 'react';
import { NotFound } from '../../ui/NotFound';
import { useDevMode } from './useDevMode';

// At module scope so the chunk is requested at most once, and only after the
// mode is on: a locked build never fetches the menu.
const DevMenu = lazy(() => import('./menu/DevMenu'));

/**
 * `/dev`. Locked, it is the not-found screen and nothing else, so an old
 * bookmark gives no hint that the page exists.
 */
export function DevRoute() {
  const { on } = useDevMode();
  if (!on) return <NotFound />;
  return (
    <Suspense fallback={null}>
      <DevMenu />
    </Suspense>
  );
}
