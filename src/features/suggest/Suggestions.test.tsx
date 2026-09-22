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

describe('Suggestions: shuffle', () => {
  // Shuffle is random, so one press can land on the outfit already showing.
  // Three presses makes that coincidence vanishingly unlikely without making
  // the test assert something weaker than "shuffle changes the outfit".
  it('changes the unlocked slots', async () => {
    const user = userEvent.setup();
    at(TOP);
    const labels = () => screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'));
    const before = labels();
    let changed = false;
    for (let press = 0; press < 3 && !changed; press += 1) {
      await user.click(screen.getByRole('button', { name: /^Shuffle/ }));
      changed = JSON.stringify(labels()) !== JSON.stringify(before);
    }
    expect(changed).toBe(true);
  });

  it('leaves the base alone', async () => {
    const user = userEvent.setup();
    at(TOP);
    const base = () => screen.getByRole('group', { name: /^Top:/ }).getAttribute('aria-label');
    const before = base();
    await user.click(screen.getByRole('button', { name: /^Shuffle/ }));
    expect(base()).toBe(before);
  });

  it('leaves a kept slot alone and says so on the button', async () => {
    const user = userEvent.setup();
    at(TOP);
    await user.click(screen.getByRole('button', { name: 'Keep Shoes' }));
    const kept = () => screen.getByRole('group', { name: /^Shoes:/ }).getAttribute('aria-label');
    const before = kept();
    await user.click(screen.getByRole('button', { name: 'Shuffle the rest' }));
    expect(kept()).toBe(before);
  });

  // The blocks change with no focus move, so a screen reader is told nothing
  // unless the live region says it. Naming the colours rather than saying
  // "Shuffled" also means an outfit that came back the same reads as the same.
  it('announces what the outfit became', async () => {
    const user = userEvent.setup();
    at(TOP);
    await user.click(screen.getByRole('button', { name: /^Shuffle/ }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Outerwear/);
    expect(status).toHaveTextContent(/Accessory/);
  });

  it('says why nothing happened when every piece is kept', async () => {
    const user = userEvent.setup();
    at(TOP);
    for (const label of ['Outerwear', 'Bottom', 'Shoes', 'Accessory']) {
      await user.click(screen.getByRole('button', { name: `Keep ${label}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Shuffle the rest' }));
    expect(screen.getByRole('status')).toHaveTextContent(/every piece is kept/i);
  });

  it('teaches the gestures until something is kept', async () => {
    const user = userEvent.setup();
    at(TOP);
    expect(screen.getByText(/hold one to keep it/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep Shoes' }));
    expect(screen.getByText(/Kept pieces stay when you shuffle/i)).toBeInTheDocument();
  });
});
