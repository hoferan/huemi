import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './routes';
import { ROUTES } from '../../e2e/routes';

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  it('renders the spike screen at the root', () => {
    at('/');
    expect(screen.getByRole('heading', { level: 1, name: 'huemi' })).toBeInTheDocument();
  });

  it('renders the not-found screen for an unknown path', () => {
    at('/nowhere');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  // The accessibility gate runs over e2e/routes.ts. A route listed there but
  // not served would make the gate pass by checking a 404 instead of a
  // screen, so the list and the table are checked against each other here.
  it.each(ROUTES.filter((route) => !route.includes('does-not-exist')))(
    'serves a real screen at %s',
    (route) => {
      at(route);
      expect(
        screen.queryByRole('heading', { level: 1, name: 'Page not found' }),
      ).not.toBeInTheDocument();
    },
  );
});
