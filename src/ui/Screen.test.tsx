import { useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InitialLocation } from './InitialLocation';
import { InitialLocationContext } from './InitialLocationContext';
import { Redirect } from './Redirect';
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

  describe('after a redirect', () => {
    // The onboarding gate's shape: nothing until an async answer arrives, then
    // a redirect. A first visit to / lands on /welcome this way.
    function Gate() {
      const [ready, setReady] = useState(false);
      useEffect(() => {
        void Promise.resolve().then(() => setReady(true));
      }, []);
      return ready ? <Redirect to="/welcome" /> : null;
    }

    function Redirecting() {
      return (
        <MemoryRouter>
          <InitialLocation>
            <Routes>
              <Route path="/" element={<Gate />} />
              <Route
                path="/welcome"
                element={
                  <Screen title="Welcome">
                    <Link to="/second">go</Link>
                    <Link to="/old">old</Link>
                  </Screen>
                }
              />
              <Route path="/old" element={<Redirect to="/second" />} />
              <Route
                path="/second"
                element={
                  <Screen title="Second">
                    <Back />
                  </Screen>
                }
              />
            </Routes>
          </InitialLocation>
        </MemoryRouter>
      );
    }

    // A redirect replaces the entry the user arrived on rather than taking
    // them anywhere, so the first screen they see is still a first load.
    // Focusing its heading drew a focus ring on a page nobody had touched.
    it('leaves focus alone when the first load redirects', async () => {
      render(<Redirecting />);
      await screen.findByRole('heading', { level: 1, name: 'Welcome' });
      expect(document.activeElement).toBe(document.body);
    });

    it('still moves focus when a navigation lands on a redirect', async () => {
      const user = userEvent.setup();
      render(<Redirecting />);
      await user.click(await screen.findByRole('link', { name: 'old' }));
      expect(screen.getByRole('heading', { level: 1, name: 'Second' })).toHaveFocus();
    });

    it('moves focus after going back to a first entry that redirected', async () => {
      const user = userEvent.setup();
      render(<Redirecting />);
      await user.click(await screen.findByRole('link', { name: 'go' }));
      await user.click(screen.getByRole('button', { name: 'back' }));
      expect(screen.getByRole('heading', { level: 1, name: 'Welcome' })).toHaveFocus();
    });
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

  it('reads a heading note as part of the heading without showing it', () => {
    render(
      <MemoryRouter>
        <InitialLocationContext value={true}>
          <Screen title="Tap your top" headingNote="2 of 4">
            <p>body</p>
          </Screen>
        </InitialLocationContext>
      </MemoryRouter>,
    );
    const heading = screen.getByRole('heading', { level: 1, name: 'Tap your top, 2 of 4' });
    expect(heading).toBeInTheDocument();
    // The note names the heading but is never part of what is printed.
    expect(heading.textContent).toBe('Tap your top');
    expect(document.title).toBe('Tap your top — huemi');
  });

  describe('with a way back', () => {
    const back = { to: '/check', title: 'Frame the outfit' };

    it('links back to the destination, named after it', () => {
      render(
        <MemoryRouter>
          <Screen title="What are you wearing?" back={back}>
            body
          </Screen>
        </MemoryRouter>,
      );
      expect(screen.getByRole('link', { name: 'Back to Frame the outfit' })).toHaveAttribute(
        'href',
        '/check',
      );
    });

    // The accessible name starts with the visible wordmark, so speech input
    // that says what it sees still reaches it (WCAG 2.5.3).
    it('links the wordmark home', () => {
      render(
        <MemoryRouter>
          <Screen title="What are you wearing?" back={back}>
            body
          </Screen>
        </MemoryRouter>,
      );
      const home = screen.getByRole('link', { name: 'huemi, home' });
      expect(home).toHaveAttribute('href', '/');
      expect(home).toHaveTextContent('huemi');
    });

    it('keeps the header beside them, all above the heading', () => {
      render(
        <MemoryRouter>
          <Screen title="Goes with it" back={back} header={<button type="button">Save</button>}>
            body
          </Screen>
        </MemoryRouter>,
      );
      const heading = screen.getByRole('heading', { level: 1 });
      for (const control of [
        screen.getByRole('link', { name: 'Back to Frame the outfit' }),
        screen.getByRole('link', { name: 'huemi, home' }),
        screen.getByRole('button', { name: 'Save' }),
      ]) {
        expect(screen.getByRole('main')).toContainElement(control);
        expect(
          control.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    });

    it('still moves focus to the heading after a navigation, not to the arrow', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <InitialLocation>
            <Routes>
              <Route
                path="/"
                element={
                  <Screen title="Entry">
                    <Link to="/next">go</Link>
                  </Screen>
                }
              />
              <Route
                path="/next"
                element={
                  <Screen title="Next" back={{ to: '/', title: 'Entry' }}>
                    body
                  </Screen>
                }
              />
            </Routes>
          </InitialLocation>
        </MemoryRouter>,
      );
      await user.click(screen.getByRole('link', { name: 'go' }));
      expect(screen.getByRole('heading', { level: 1, name: 'Next' })).toHaveFocus();
    });
  });

  it('offers no way back or home without a destination', () => {
    render(
      <MemoryRouter>
        <Screen title="Start with a garment">body</Screen>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  // Moving between screens keeps the document's scroll position, so a screen
  // reached from a scrolled one opened partway down, its heading cut off at
  // the top. A new screen starts at the top. Going back is left alone: the
  // browser puts that screen back where it was.
  describe('scroll on arrival', () => {
    let scrolledTo: unknown[] = [];
    beforeEach(() => {
      scrolledTo = [];
      vi.spyOn(window, 'scrollTo').mockImplementation((...args: unknown[]) => {
        scrolledTo.push(args);
      });
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('starts a screen reached going forward at the top', async () => {
      const user = userEvent.setup();
      render(<Shell />);
      await user.click(screen.getByRole('link', { name: 'go' }));
      expect(scrolledTo).toEqual([[0, 0]]);
    });

    it('leaves the first screen and a return by back where they are', async () => {
      const user = userEvent.setup();
      render(<Shell />);
      expect(scrolledTo).toEqual([]);
      await user.click(screen.getByRole('link', { name: 'go' }));
      scrolledTo = [];
      await user.click(screen.getByRole('button', { name: 'back' }));
      expect(scrolledTo).toEqual([]);
    });
  });
});
