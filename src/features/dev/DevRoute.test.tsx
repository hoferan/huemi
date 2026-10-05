import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../../session/SessionProvider';
import { OutfitsProvider } from '../saved/OutfitsProvider';
import { fakeOutfitStore } from '../saved/testing';
import { DevModeProvider } from './DevModeProvider';
import { DevRoute } from './DevRoute';
import { fakeDevModeStore } from './testing';

function renderRoute(on: boolean) {
  render(
    <MemoryRouter initialEntries={['/dev']}>
      <SessionProvider>
        <OutfitsProvider store={fakeOutfitStore()}>
          <DevModeProvider store={fakeDevModeStore(on)}>
            <DevRoute />
          </DevModeProvider>
        </OutfitsProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('DevRoute', () => {
  it('renders not found while off', async () => {
    renderRoute(false);
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Developer mode' })).not.toBeInTheDocument();
  });

  it('renders the menu while on', async () => {
    renderRoute(true);
    expect(await screen.findByRole('heading', { name: 'Developer mode' })).toBeInTheDocument();
  });
});
