import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { OutfitsProvider } from '../features/saved/OutfitsProvider';
import { fakeOutfitStore, makeOutfit } from '../features/saved/testing';
import { SessionProvider } from '../session/SessionProvider';
import { Announcer } from '../ui/Announcer';
import { InitialLocationContext } from '../ui/InitialLocationContext';
import { AppRoutes } from './routes';
import { ToastHost } from './ToastHost';

// The whole delete round trip, which spans a feature and the shell: the card
// goes, focus lands on Undo, Undo brings the card back and focus lands on it.
// The only outfit is deleted, so the screen passes through its empty state.
describe('deleting a saved outfit, then undoing it', () => {
  it('keeps focus on something that exists the whole way', async () => {
    const store = fakeOutfitStore([makeOutfit()]);
    render(
      <MemoryRouter initialEntries={['/saved']}>
        <InitialLocationContext value={true}>
          <SessionProvider>
            <OutfitsProvider store={store}>
              <Announcer>
                <AppRoutes />
                <ToastHost />
              </Announcer>
            </OutfitsProvider>
          </SessionProvider>
        </InitialLocationContext>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete Navy bottom' }));
    const undo = await screen.findByRole('button', { name: 'Undo' });
    await waitFor(() => expect(undo).toHaveFocus());
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument();

    await user.click(undo);
    const card = await screen.findByRole('button', { name: 'Navy bottom' });
    await waitFor(() => expect(card).toHaveFocus());
    expect(store.contents()).toEqual([makeOutfit()]);
  });
});
