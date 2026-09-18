import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Screen } from './Screen';

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Screen title="Entry">
            <Link to="/second">go</Link>
          </Screen>
        }
      />
      <Route path="/second" element={<Screen title="Second">done</Screen>} />
    </Routes>
  );
}

describe('Screen', () => {
  it('renders the title as the only h1 inside a main landmark', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByRole('heading', { level: 1, name: 'Entry' }));
  });

  it('sets the document title', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Entry — huemi');
  });

  it('leaves focus alone on first load', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(document.activeElement).toBe(document.body);
  });

  it('moves focus to the heading after a navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('link', { name: 'go' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Second' })).toHaveFocus();
  });
});
