import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { HistoryTrail } from './HistoryTrail';
import { TrailLink } from './TrailLink';

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function SystemBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      system back
    </button>
  );
}

function Page({ next }: { next?: string }) {
  return (
    <>
      <Where />
      <SystemBack />
      {next && <Link to={next}>forward</Link>}
      <TrailLink to="/slot">to slot</TrailLink>
    </>
  );
}

function App({ entries, trail = true }: { entries: string[]; trail?: boolean }) {
  const routes = (
    <Routes>
      <Route path="/" element={<Page next="/slot" />} />
      <Route path="/slot" element={<Page next="/color?slot=top" />} />
      <Route path="/color" element={<Page />} />
    </Routes>
  );
  const wrap = (children: ReactNode) =>
    trail ? <HistoryTrail>{children}</HistoryTrail> : children;
  return <MemoryRouter initialEntries={entries}>{wrap(routes)}</MemoryRouter>;
}

const where = () => screen.getByTestId('where').textContent;

describe('TrailLink', () => {
  it('renders a real link to its destination', () => {
    render(<App entries={['/color?slot=top']} />);
    expect(screen.getByRole('link', { name: 'to slot' })).toHaveAttribute('href', '/slot');
  });

  // Stepping back rather than pushing is what leaves the system back button
  // pointing behind the destination, not at the screen just left.
  it('steps back through history when the destination is behind', async () => {
    const user = userEvent.setup();
    render(<App entries={['/']} />);
    await user.click(screen.getByRole('link', { name: 'forward' }));
    await user.click(screen.getByRole('link', { name: 'forward' }));
    expect(where()).toBe('/color?slot=top');

    await user.click(screen.getByRole('link', { name: 'to slot' }));
    expect(where()).toBe('/slot');
    await user.click(screen.getByRole('button', { name: 'system back' }));
    expect(where()).toBe('/');
  });

  // Opened cold on a deep link, nothing is behind, so the destination opens
  // as a new entry and the system back button returns to where the user was.
  it('opens the destination when it is not behind', async () => {
    const user = userEvent.setup();
    render(<App entries={['/color?slot=top']} />);
    await user.click(screen.getByRole('link', { name: 'to slot' }));
    expect(where()).toBe('/slot');
    await user.click(screen.getByRole('button', { name: 'system back' }));
    expect(where()).toBe('/color?slot=top');
  });

  // Screens under test render without the provider, and must still work.
  it('opens the destination when no trail is kept', async () => {
    const user = userEvent.setup();
    render(<App entries={['/', '/slot', '/color?slot=top']} trail={false} />);
    await user.click(screen.getByRole('link', { name: 'to slot' }));
    expect(where()).toBe('/slot');
    await user.click(screen.getByRole('button', { name: 'system back' }));
    expect(where()).toBe('/color?slot=top');
  });
});
