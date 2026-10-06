import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
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

/**
 * What a developer route shows when its chunk does not load, offline before
 * the worker has it or after a deploy has replaced it. React keeps a failed
 * lazy import failed, so the way out is a full load of the same address,
 * which is what a plain anchor does.
 */
function ChunkFailed() {
  const { pathname, search } = useLocation();
  return (
    <Screen title="Developer mode" back={HOME}>
      <p {...stylex.props(styles.text)}>The developer menu didn&apos;t load.</p>
      <a href={pathname + search} {...stylex.props(styles.link)}>
        Reload
      </a>
    </Screen>
  );
}

/**
 * A route that exists only in developer mode. Locked, it is the not-found
 * screen and nothing else, so an old bookmark gives no hint that the page
 * exists. Unlocked, it renders its children, which are lazy, so a locked
 * build never fetches them.
 */
export function DevOnly({ children }: { children: ReactNode }) {
  const { on } = useDevMode();
  const { pathname } = useLocation();
  if (!on) return <NotFound />;
  return (
    // Keyed by the path. The router keeps this component mounted from one
    // developer route to the next, so without the key a chunk that failed on
    // one route would leave the next showing the failure too.
    <DevErrorBoundary key={pathname} fallback={<ChunkFailed />}>
      <Suspense fallback={null}>{children}</Suspense>
    </DevErrorBoundary>
  );
}
