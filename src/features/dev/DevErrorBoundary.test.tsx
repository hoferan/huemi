import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevSlot } from '../../ui/DevSlot';
import { DevModeProvider } from './DevModeProvider';
import { DevRoute } from './DevRoute';
import { DevSlotHost } from './DevSlotHost';
import { fakeDevModeStore } from './testing';

// Both lazy chunks fail to load, as they do offline before the worker has
// cached them or after a deploy has removed the old file names.
vi.mock('./registry', () => Promise.reject(new Error('Failed to fetch registry chunk')));
vi.mock('./menu/DevMenu', () => Promise.reject(new Error('Failed to fetch menu chunk')));

beforeEach(() => {
  // React logs the caught error; the assertions below are what prove the catch.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a developer chunk that fails to load', () => {
  it('leaves a slot empty and the screen around it standing', async () => {
    render(
      <MemoryRouter>
        <DevModeProvider store={fakeDevModeStore(true)}>
          <DevSlotHost>
            <h1>The screen</h1>
            <DevSlot name="screen.badge" context={{}} />
          </DevSlotHost>
        </DevModeProvider>
      </MemoryRouter>,
    );
    // The boundary logs what it caught. Vitest wraps a rejected mock, so the
    // chunk's own error is the cause.
    await vi.waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: expect.objectContaining({
            message: 'Failed to fetch registry chunk',
          }) as unknown,
        }),
        expect.any(String),
      ),
    );
    expect(screen.getByRole('heading', { name: 'The screen' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Developer mode' })).not.toBeInTheDocument();
  });

  it('says the menu did not load and offers a reload', async () => {
    render(
      <MemoryRouter initialEntries={['/dev']}>
        <DevModeProvider store={fakeDevModeStore(true)}>
          <DevRoute />
        </DevModeProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Developer mode' })).toBeInTheDocument();
    expect(screen.getByText("The developer menu didn't load.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reload' })).toHaveAttribute('href', '/dev');
  });
});
