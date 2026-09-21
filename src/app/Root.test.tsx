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
});
