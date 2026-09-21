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
  it('leaves focus at the document start on arrival', () => {
    render(<Root />);
    expect(document.activeElement).toBe(document.body);
  });
});
