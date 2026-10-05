import { Suspense, lazy } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';
import { HOME } from '../../ui/home';
import { NotFound } from '../../ui/NotFound';
import { Screen } from '../../ui/Screen';
import { DevErrorBoundary } from './DevErrorBoundary';
import { useDevMode } from './useDevMode';

const styles = stylex.create({
  text: { margin: 0 },
  link: { display: 'inline-flex', alignItems: 'center', minHeight: tokens.touchTarget },
});

// At module scope so the chunk is requested at most once, and only after the
// mode is on: a locked build never fetches the menu.
const DevMenu = lazy(() => import('./menu/DevMenu'));

/**
 * What `/dev` shows when the menu's chunk does not load, offline before the
 * worker has it or after a deploy has replaced it. React keeps a failed lazy
 * import failed, so the way out is a full page load, which is what a plain
 * anchor does.
 */
function MenuFailed() {
  return (
    <Screen title="Developer mode" back={HOME}>
      <p {...stylex.props(styles.text)}>The developer menu didn&apos;t load.</p>
      <a href="/dev" {...stylex.props(styles.link)}>
        Reload
      </a>
    </Screen>
  );
}

/**
 * `/dev`. Locked, it is the not-found screen and nothing else, so an old
 * bookmark gives no hint that the page exists.
 */
export function DevRoute() {
  const { on } = useDevMode();
  if (!on) return <NotFound />;
  return (
    <DevErrorBoundary fallback={<MenuFailed />}>
      <Suspense fallback={null}>
        <DevMenu />
      </Suspense>
    </DevErrorBoundary>
  );
}
