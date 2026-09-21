import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './routes';
import { APP_ROUTES } from './routeTable';
import { ROUTES } from '../../e2e/routes';

// The unknown path in e2e/routes.ts exercises the catch-all on purpose, so it
// is the one entry with no route of its own.
const covered = ROUTES.filter((route) => !route.includes('does-not-exist'));
const served = APP_ROUTES.map((route) => route.path).filter(
  (path) => !path.includes(':') && !path.includes('*'),
);

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  it('renders the entry screen at the root', () => {
    at('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Start with a garment' }),
    ).toBeInTheDocument();
  });

  it('renders the not-found screen for an unknown path', () => {
    at('/nowhere');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  // The accessibility gate runs over e2e/routes.ts, so the two lists have to
  // agree in both directions. A route listed there but not served makes the
  // gate pass by checking a 404 instead of a screen. A route served but not
  // listed is a screen axe, reflow and the text-size check never visit, and
  // nothing else in the repository notices. Both assertions compare arrays so
  // that a failure names the path rather than reporting false !== true.
  it('lists every served route in e2e/routes.ts', () => {
    expect(served.filter((path) => !covered.includes(path))).toEqual([]);
  });

  it('serves every route e2e/routes.ts visits', () => {
    expect(covered.filter((path) => !served.includes(path))).toEqual([]);
  });

  it.each(covered)('serves a real screen at %s', (route) => {
    at(route);
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Page not found' }),
    ).not.toBeInTheDocument();
  });
});
