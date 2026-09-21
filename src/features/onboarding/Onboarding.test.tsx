import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { ONBOARDED_KEY } from '../../storage/localPreferences';
import { Onboarding } from './Onboarding';

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/welcome']}>
      <InitialLocationContext value={true}>
        <Routes>
          <Route path="/welcome" element={<Onboarding />} />
          <Route path="/" element={<p>entry screen</p>} />
        </Routes>
      </InitialLocationContext>
    </MemoryRouter>,
  );
}

// Drives a real back navigation, the way src/ui/Screen.test.tsx does: a probe
// component that calls navigate(-1) is enough to walk MemoryRouter's history.
function Back() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      back
    </button>
  );
}

function renderWithEntry() {
  return render(
    <MemoryRouter initialEntries={['/welcome']}>
      <InitialLocationContext value={true}>
        <Routes>
          <Route path="/welcome" element={<Onboarding />} />
          <Route
            path="/"
            element={
              <>
                <p>entry screen</p>
                <Back />
              </>
            }
          />
        </Routes>
      </InitialLocationContext>
    </MemoryRouter>,
  );
}

describe('Onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('states what the app does', () => {
    renderAt();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'One piece you own. The rest that goes with it.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pick the color of one garment.')).toBeInTheDocument();
    expect(screen.getByText('See what works for the rest.')).toBeInTheDocument();
    expect(screen.getByText('Keep the outfits you like.')).toBeInTheDocument();
  });

  it('offers exactly one control, and it is not a skip', () => {
    renderAt();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Start');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('records the flag and moves to the entry screen', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByText('entry screen')).toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDED_KEY)).toBe('true');
  });

  // A screen the spec shows once must not return on back. Start has to
  // replace the onboarding entry rather than push a new one, or the entry
  // screen's back button lands right back on /welcome, which renders
  // onboarding unconditionally.
  it('replaces onboarding in history, so back does not return to it', async () => {
    const user = userEvent.setup();
    renderWithEntry();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await screen.findByText('entry screen');
    await user.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByText('entry screen')).toBeInTheDocument();
  });
});
