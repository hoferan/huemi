import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../../session/SessionProvider';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { Suggestions } from './Suggestions';

function Where() {
  const { pathname } = useLocation();
  return <p>{`at ${pathname}`}</p>;
}

function at(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <InitialLocationContext value={true}>
        <SessionProvider>
          <Announcer>
            <Routes>
              <Route path="/suggest" element={<Suggestions />} />
              <Route path="/" element={<Where />} />
            </Routes>
          </Announcer>
        </SessionProvider>
      </InitialLocationContext>
    </MemoryRouter>,
  );
}

const TOP = '/suggest?slot=top&hex=%23c39a3a';

describe('Suggestions', () => {
  it('sends a visitor with no usable base back to the entry screen', () => {
    at('/suggest');
    expect(screen.getByText('at /')).toBeInTheDocument();
  });

  it('shows a block for every slot', () => {
    at(TOP);
    expect(screen.getAllByRole('group')).toHaveLength(5);
  });

  it('shows the base as its own colour, with no controls on it', () => {
    at(TOP);
    const base = screen.getByRole('group', { name: /^Top:/ });
    expect(base).toBeInTheDocument();
    expect(base.querySelectorAll('button')).toHaveLength(0);
  });

  it('gives every other slot a suggestion with its three controls', () => {
    at(TOP);
    for (const label of ['Outerwear', 'Bottom', 'Shoes', 'Accessory']) {
      expect(screen.getByRole('button', { name: `Next suggestion for ${label}` })).toBeEnabled();
      expect(screen.getByRole('button', { name: `Keep ${label}` })).toBeInTheDocument();
    }
  });

  it('never shows one colour name twice', () => {
    at(TOP);
    const names = screen
      .getAllByRole('group')
      .map((group) => group.getAttribute('aria-label')!.split(': ')[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('advances one slot without touching the others', async () => {
    const user = userEvent.setup();
    at(TOP);
    const before = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    await user.click(screen.getByRole('button', { name: 'Next suggestion for Shoes' }));
    const after = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    const moved = before.filter((label, index) => label !== after[index]);
    expect(moved).toHaveLength(1);
  });

  it('keeps a slot and stops it advancing', async () => {
    const user = userEvent.setup();
    at(TOP);
    await user.click(screen.getByRole('button', { name: 'Keep Shoes' }));
    expect(screen.getByRole('button', { name: 'Keep Shoes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Next suggestion for Shoes' })).toBeDisabled();
  });
});
