import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppRoutes } from './routes';
import { APP_ROUTES } from './routeTable';
import { OutfitsProvider } from '../features/saved/OutfitsProvider';
import { fakeOutfitStore } from '../features/saved/testing';
import { ONBOARDED_KEY } from '../storage/localPreferences';
import { SessionProvider } from '../session/SessionProvider';
import { Announcer } from '../ui/Announcer';
import { ROUTES } from '../../e2e/routes';

// The unknown path in e2e/routes.ts exercises the catch-all on purpose, so it
// is the one entry with no route of its own.
const covered = ROUTES.filter((route) => !route.includes('does-not-exist'));
const served = APP_ROUTES.map((route) => route.path).filter(
  (path) => !path.includes(':') && !path.includes('*'),
);

// e2e/routes.ts holds `/color?slot=top`, a concrete URL, rather than the bare
// path the route table uses: the checks navigate to whatever is listed there,
// and a bare `/color` redirects to `/slot` and would scan that screen twice —
// the mistake the onboarding gate already made once, repaired in #14. The
// route table's path has no query string to match against, so the pathname is
// what the two sides have in common.
function pathnameOnly(route: string): string {
  return route.split('?')[0]!;
}

// The picker reads the session, and the custom colour screen also announces
// through the live region; Root normally supplies both above the router.
// This is not Root: it renders AppRoutes bare, on purpose, so a route
// missing from the table fails here rather than in a heavier harness. The
// session provider and the announcer still have to be here, for the route
// table entries that now need them, and the outfits provider is here for the
// saved screen.
function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <OutfitsProvider store={fakeOutfitStore()}>
          <Announcer>
            <AppRoutes />
          </Announcer>
        </OutfitsProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  // The root route now sits behind OnboardingGate, which only shows the
  // entry screen to a visitor the store already knows has onboarded.
  beforeEach(() => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
  });

  it('renders the entry screen at the root', async () => {
    at('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Start with a garment' }),
    ).toBeInTheDocument();
  });

  it('renders the not-found screen for an unknown path', async () => {
    at('/nowhere');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  // The accessibility gate runs over e2e/routes.ts, so the two lists have to
  // agree in both directions. A route listed there but not served makes the
  // gate pass by checking a 404 instead of a screen. A route served but not
  // listed is a screen axe, reflow and the text-size check never visit, and
  // nothing else in the repository notices. Both assertions compare arrays so
  // that a failure names the path rather than reporting false !== true.
  it('shows the camera screen as unavailable where there is no camera', async () => {
    // jsdom has no mediaDevices. The screen has to settle on a state rather
    // than wait on a camera forever.
    at('/camera?slot=top');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No camera found' }),
    ).toBeInTheDocument();
  });

  it('lists every served route in e2e/routes.ts', () => {
    const coveredPaths = covered.map(pathnameOnly);
    expect(served.filter((path) => !coveredPaths.includes(path))).toEqual([]);
  });

  it('serves every route e2e/routes.ts visits', () => {
    expect(covered.map(pathnameOnly).filter((path) => !served.includes(path))).toEqual([]);
  });

  // Absence of the not-found heading is a weak proof once the root sits
  // behind an async gate: right after render, nothing has painted yet, so
  // "not a 404" is true whether the route is wired correctly, wired to the
  // wrong screen, or wired to nothing forever. Naming each route's real
  // heading and awaiting it means a route wired wrong fails with a mismatch
  // instead of passing by never being checked.
  const REAL_HEADINGS: Record<string, string> = {
    '/': 'Start with a garment',
    '/welcome': 'One piece you own. The rest that goes with it.',
    '/slot': 'Choose a garment',
    '/color?slot=top': 'Pick a color',
    '/color/custom?slot=top': 'Mix your own',
    '/camera?slot=top': 'Frame the garment',
    // Nothing is captured here, so the confirm screen hands over to the camera.
    '/confirm?slot=top': 'Frame the garment',
    '/check': 'Frame the outfit',
    '/suggest?slot=top&hex=%23c39a3a': 'Goes with it',
    '/saved': 'Saved outfits',
  };

  it.each(covered)('serves a real screen at %s', async (route) => {
    const heading = REAL_HEADINGS[route];
    if (!heading) throw new Error(`No expected heading recorded for ${route}`);
    at(route);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
