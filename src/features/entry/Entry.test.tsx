import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { Entry } from './Entry';

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <InitialLocationContext value={true}>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/slot" element={<p>slot screen</p>} />
        </Routes>
      </InitialLocationContext>
    </MemoryRouter>,
  );
}

describe('Entry', () => {
  it('leads with what to do', () => {
    renderAt();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Start with a garment' }),
    ).toBeInTheDocument();
  });

  it('shows the wordmark above the heading without competing with it', () => {
    renderAt();
    const wordmark = screen.getByText('huemi');
    expect(wordmark.tagName).not.toBe('H1');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('starts the color route', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Pick a color' }));
    expect(await screen.findByText('slot screen')).toBeInTheDocument();
  });
});
