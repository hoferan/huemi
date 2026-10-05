import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import { ONBOARDED_KEY } from '../../../storage/localPreferences';
import { OutfitsProvider } from '../../saved/OutfitsProvider';
import { fakeOutfitStore, makeOutfit } from '../../saved/testing';
import { DevModeProvider } from '../DevModeProvider';
import { fakeDevModeStore } from '../testing';
import { BUILD } from './build';
import DevMenu from './DevMenu';
import type { WorkerPort } from './worker';
import { fakeWorker } from './worker.testing';

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function setup(options: { worker?: WorkerPort; outfits?: number } = {}) {
  const worker = options.worker ?? fakeWorker();
  const outfitStore = fakeOutfitStore(
    Array.from({ length: options.outfits ?? 0 }, (_, i) =>
      makeOutfit({ id: `o${i}`, createdAt: `2026-09-2${i}T10:00:00.000Z` }),
    ),
  );
  const devStore = fakeDevModeStore(true);
  render(
    <MemoryRouter initialEntries={['/dev']}>
      <SessionProvider>
        <OutfitsProvider store={outfitStore}>
          <DevModeProvider store={devStore}>
            <Routes>
              <Route path="/dev" element={<DevMenu worker={worker} />} />
              <Route path="/" element={<p>home</p>} />
            </Routes>
            <Toast />
            <Where />
          </DevModeProvider>
        </OutfitsProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
  return { user: userEvent.setup(), worker, outfitStore, devStore };
}

beforeEach(() => localStorage.clear());

describe('DevMenu', () => {
  it('shows the build commit and date', async () => {
    setup();
    await screen.findByText('No offline cache.');
    expect(screen.getByRole('heading', { name: 'Build' })).toBeInTheDocument();
    expect(screen.getByText(BUILD.commit)).toBeInTheDocument();
    expect(screen.getByText(BUILD.date)).toBeInTheDocument();
  });

  it('resets onboarding', async () => {
    const { user } = setup();
    localStorage.setItem(ONBOARDED_KEY, 'true');
    await user.click(screen.getByRole('button', { name: 'Reset onboarding' }));
    await waitFor(() => expect(localStorage.getItem(ONBOARDED_KEY)).toBe('false'));
    expect(screen.getByTestId('toast')).toHaveTextContent('Onboarding will show next time.');
  });

  it('clears every saved outfit after confirming', async () => {
    const { user, outfitStore } = setup({ outfits: 3 });
    await user.click(await screen.findByRole('button', { name: 'Clear saved outfits' }));
    expect(screen.getByRole('dialog', { name: 'Delete all 3 saved outfits?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete all' }));
    await waitFor(() => expect(outfitStore.contents()).toEqual([]));
    expect(screen.getByTestId('toast')).toHaveTextContent('Saved outfits cleared.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so when the outfits could not be cleared', async () => {
    const { user, outfitStore } = setup({ outfits: 2 });
    outfitStore.fail.remove = true;
    await user.click(await screen.findByRole('button', { name: 'Clear saved outfits' }));
    await user.click(screen.getByRole('button', { name: 'Delete all' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't clear saved outfits."),
    );
    expect(outfitStore.contents()).toHaveLength(2);
  });

  it('uses the singular for one outfit', async () => {
    const { user } = setup({ outfits: 1 });
    await user.click(await screen.findByRole('button', { name: 'Clear saved outfits' }));
    expect(screen.getByRole('dialog', { name: 'Delete all 1 saved outfit?' })).toBeInTheDocument();
  });

  it('keeps them when the sheet is dismissed', async () => {
    const { user, outfitStore } = setup({ outfits: 3 });
    await user.click(await screen.findByRole('button', { name: 'Clear saved outfits' }));
    await user.click(screen.getByRole('button', { name: 'Keep them' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(outfitStore.contents()).toHaveLength(3);
  });

  it('says there are none to clear', async () => {
    setup();
    expect(await screen.findByText('No saved outfits.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear saved outfits' })).not.toBeInTheDocument();
  });

  it('lists the cache names', async () => {
    setup({ worker: fakeWorker({ caches: ['huemi-abc123def0'] }) });
    expect(await screen.findByText('huemi-abc123def0')).toBeInTheDocument();
  });

  it('treats a cache listing that fails as no cache', async () => {
    const worker = { ...fakeWorker(), cacheNames: () => Promise.reject(new Error('no caches')) };
    setup({ worker });
    expect(await screen.findByText('No offline cache.')).toBeInTheDocument();
  });

  it('says there is no offline cache', async () => {
    setup();
    expect(await screen.findByText('No offline cache.')).toBeInTheDocument();
  });

  it('checks for an update', async () => {
    const { user } = setup({ worker: fakeWorker({ registered: true }) });
    await user.click(screen.getByRole('button', { name: 'Check for update' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent('Checked for an update.'),
    );
  });

  it('reports a missing worker on update', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Check for update' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent('No offline worker is registered.'),
    );
  });

  it('unregisters and reloads', async () => {
    const worker = fakeWorker({ registered: true });
    const { user } = setup({ worker });
    await user.click(screen.getByRole('button', { name: 'Unregister and reload' }));
    await waitFor(() => expect(worker.reloaded).toBe(1));
    expect(await worker.update()).toBe('none');
  });

  it('reports a failed update check', async () => {
    const worker = { ...fakeWorker(), update: () => Promise.reject(new Error('offline')) };
    const { user } = setup({ worker });
    await user.click(screen.getByRole('button', { name: 'Check for update' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't check for an update."),
    );
  });

  it('reports a failed unregister and does not reload', async () => {
    const base = fakeWorker({ registered: true });
    const worker = { ...base, unregister: () => Promise.reject(new Error('blocked')) };
    const { user } = setup({ worker });
    await user.click(screen.getByRole('button', { name: 'Unregister and reload' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent(
        "Couldn't unregister the offline worker.",
      ),
    );
    expect(base.reloaded).toBe(0);
  });

  it('does not say there are no outfits while they load', async () => {
    setup();
    expect(screen.queryByText('No saved outfits.')).not.toBeInTheDocument();
    expect(await screen.findByText('No saved outfits.')).toBeInTheDocument();
  });

  it('locks and goes home', async () => {
    const { user, devStore } = setup();
    await user.click(screen.getByRole('button', { name: 'Lock developer mode' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/));
    expect(devStore.value).toBe(false);
    expect(screen.getByTestId('toast')).toHaveTextContent('Developer mode off');
  });
});
