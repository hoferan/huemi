import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { Entry } from './Entry';

function SlotProbe() {
  return <p data-testid="slot-search">{useLocation().search}</p>;
}

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <InitialLocationContext value={true}>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/slot" element={<SlotProbe />} />
          <Route path="/saved" element={<p>saved screen</p>} />
          <Route path="/check" element={<p>outfit camera</p>} />
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

  it('leads with the camera', () => {
    renderAt();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Take a photo',
      'Pick a color',
      'Already dressed? Check your outfit',
    ]);
  });

  it('takes the camera route through slot choice', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Take a photo' }));
    expect(await screen.findByText('?next=camera')).toBeInTheDocument();
  });

  it('starts the color route', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Pick a color' }));
    expect(await screen.findByTestId('slot-search')).toHaveTextContent('');
  });

  it('links to the saved outfits', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('link', { name: 'Saved' }));
    expect(await screen.findByText('saved screen')).toBeInTheDocument();
  });
  it('offers the outfit check to someone already dressed', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Already dressed? Check your outfit' }));
    expect(await screen.findByText('outfit camera')).toBeInTheDocument();
  });
});
