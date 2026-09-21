import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ONBOARDED_KEY } from '../../storage/localPreferences';
import { OnboardingGate } from './OnboardingGate';

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <OnboardingGate>
              <p>entry screen</p>
            </OnboardingGate>
          }
        />
        <Route path="/welcome" element={<p>onboarding screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OnboardingGate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends a first-time visitor to onboarding', async () => {
    renderAt();
    expect(await screen.findByText('onboarding screen')).toBeInTheDocument();
  });

  it('lets a returning visitor straight through', async () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    renderAt();
    expect(await screen.findByText('entry screen')).toBeInTheDocument();
  });

  it('shows neither screen while the answer is unknown', () => {
    renderAt();
    expect(screen.queryByText('entry screen')).not.toBeInTheDocument();
    expect(screen.queryByText('onboarding screen')).not.toBeInTheDocument();
  });
});
