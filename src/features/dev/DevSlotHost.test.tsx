import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { DevSlot } from '../../ui/DevSlot';
import { DevModeProvider } from './DevModeProvider';
import { DevSlotHost } from './DevSlotHost';
import { fakeDevModeStore } from './testing';

const loaded = vi.hoisted(() => vi.fn());
vi.mock('./registry', async () => {
  loaded();
  return await vi.importActual<typeof import('./registry')>('./registry');
});

function renderSlot(on: boolean) {
  return render(
    <MemoryRouter>
      <DevModeProvider store={fakeDevModeStore(on)}>
        <DevSlotHost>
          <DevSlot name="screen.badge" context={{}} />
        </DevSlotHost>
      </DevModeProvider>
    </MemoryRouter>,
  );
}

describe('DevSlotHost', () => {
  it('renders nothing and imports nothing while off', () => {
    loaded.mockClear();
    const { container } = renderSlot(false);
    expect(container).toBeEmptyDOMElement();
    expect(loaded).not.toHaveBeenCalled();
  });

  it('renders the chip while on', async () => {
    renderSlot(true);
    const chip = await screen.findByRole('link', { name: 'Developer mode' });
    expect(chip).toHaveAttribute('href', '/dev');
  });
});
