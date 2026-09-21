import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
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
});
