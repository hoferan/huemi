import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { SlotChoice } from './SlotChoice';

function Where() {
  const { pathname, search } = useLocation();
  return <p>{pathname + search}</p>;
}

function renderAt(url = '/slot') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <InitialLocationContext value={true}>
        <Routes>
          <Route path="/slot" element={<SlotChoice />} />
          <Route path="/color" element={<Where />} />
          <Route path="/camera" element={<Where />} />
        </Routes>
      </InitialLocationContext>
    </MemoryRouter>,
  );
}

describe('SlotChoice', () => {
  it('offers every slot the model defines', () => {
    renderAt();
    for (const label of ['Outerwear', 'Top', 'Bottom', 'Shoes', 'Accessory']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('carries the chosen slot to the picker in the URL', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Bottom' }));
    expect(await screen.findByText('/color?slot=bottom')).toBeInTheDocument();
  });

  it('leads to the camera when the camera is where the user was going', async () => {
    const user = userEvent.setup();
    renderAt('/slot?next=camera');
    await user.click(screen.getByRole('button', { name: 'Top' }));
    expect(await screen.findByText('/camera?slot=top')).toBeInTheDocument();
  });

  it('falls back to the picker for a next it does not know', async () => {
    const user = userEvent.setup();
    renderAt('/slot?next=elsewhere');
    await user.click(screen.getByRole('button', { name: 'Top' }));
    expect(await screen.findByText('/color?slot=top')).toBeInTheDocument();
  });
});
