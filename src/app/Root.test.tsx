import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ONBOARDED_KEY } from '../storage/localPreferences';
import { Root } from './Root';

describe('Root', () => {
  // The root route now sits behind OnboardingGate, which only shows the
  // entry screen to a visitor the store already knows has onboarded.
  beforeEach(() => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
  });

  it('renders the routed app with a live region above it', async () => {
    render(<Root />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Start with a garment' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // Screen only knows which load is the first one because Root mounts
  // InitialLocation. Without it every screen grabs focus on arrival, and no
  // test inside src/ui/ can see that the shell forgot to wire it up.
  //
  // The onboarding gate resolves its stored flag in a microtask, so nothing
  // has rendered yet at the moment a synchronous render() returns. Awaiting
  // the entry screen's heading first means the assertion below runs against
  // the screen Root actually produced, not against a still-empty document.
  it('leaves focus at the document start on arrival', async () => {
    render(<Root />);
    await screen.findByRole('heading', { level: 1, name: 'Start with a garment' });
    expect(document.activeElement).toBe(document.body);
  });

  // Root.test.tsx is the one place nothing else stands in for `<Root>`'s own
  // wiring: routes.test.tsx supplies its own `SessionProvider` around
  // `AppRoutes` directly, so a `SessionProvider` deleted from `Root` itself
  // would still pass the rest of the unit suite while every session-reading
  // screen threw as soon as a real user reached it. The picker is one such
  // screen, so visiting it here is what actually exercises the wiring.
  it('wires the session through to a screen that reads it', async () => {
    window.history.pushState({}, '', '/color?slot=top');
    render(<Root />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pick a color' }),
    ).toBeInTheDocument();
  });
});
