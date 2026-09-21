import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InitialLocation } from './InitialLocation';
import { Screen } from './Screen';

function Back() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      back
    </button>
  );
}

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
      <Route
        path="/second"
        element={
          <Screen title="Second">
            <Back />
          </Screen>
        }
      />
    </Routes>
  );
}

function Shell() {
  return (
    <MemoryRouter>
      <InitialLocation>
        <App />
      </InitialLocation>
    </MemoryRouter>
  );
}

describe('Screen', () => {
  it('renders the title as the only h1 inside a main landmark', () => {
    render(<Shell />);
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByRole('heading', { level: 1, name: 'Entry' }));
  });

  it('sets the document title', () => {
    render(<Shell />);
    expect(document.title).toBe('Entry — huemi');
  });

  it('leaves focus alone on first load', () => {
    render(<Shell />);
    expect(document.activeElement).toBe(document.body);
  });

  it('moves focus to the heading after a navigation', async () => {
    const user = userEvent.setup();
    render(<Shell />);
    await user.click(screen.getByRole('link', { name: 'go' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Second' })).toHaveFocus();
  });

  // The first history entry carries no history state, so React Router derives
  // its key as `default` again when the user comes back to it. A guard that
  // tests the key alone therefore treats the return trip as a first load and
  // leaves focus on the body while the heading changes underneath it.
  it('moves focus to the heading after going back to the first entry', async () => {
    const user = userEvent.setup();
    render(<Shell />);
    await user.click(screen.getByRole('link', { name: 'go' }));
    await user.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Entry' })).toHaveFocus();
  });

  it('uses documentTitle for the tab when the heading is unwieldy', () => {
    render(
      <MemoryRouter>
        <Screen title="One piece you own. The rest that goes with it." documentTitle="Welcome">
          body
        </Screen>
      </MemoryRouter>,
    );
    expect(document.title).toBe('Welcome — huemi');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'One piece you own. The rest that goes with it.',
      }),
    ).toBeInTheDocument();
  });

  it('renders a header above the heading, inside the main landmark', () => {
    render(
      <MemoryRouter>
        <Screen title="Entry" header={<p>huemi</p>}>
          body
        </Screen>
      </MemoryRouter>,
    );
    const main = screen.getByRole('main');
    const wordmark = screen.getByText('huemi');
    expect(main).toContainElement(wordmark);
    expect(
      wordmark.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
