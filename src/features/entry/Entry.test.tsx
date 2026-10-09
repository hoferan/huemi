import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { DevModeProvider } from '../dev/DevModeProvider';
import { DevSlotHost } from '../dev/DevSlotHost';
import { fakeDevModeStore } from '../dev/testing';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { installOffer } from '../install/installOffer.testing';
import { Entry } from './Entry';

function SlotProbe() {
  return <p data-testid="slot-search">{useLocation().search}</p>;
}

function ToastProbe() {
  return <p data-testid="toast">{useSession().state.toast?.message}</p>;
}

function renderAt() {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/']}>
        <InitialLocationContext value={true}>
          <Routes>
            <Route path="/" element={<Entry />} />
            <Route path="/slot" element={<SlotProbe />} />
            <Route path="/saved" element={<p>saved screen</p>} />
            <Route path="/check" element={<p>outfit camera</p>} />
          </Routes>
        </InitialLocationContext>
      </MemoryRouter>
    </SessionProvider>,
  );
}

function renderWithMode(env: { dev: boolean; hash: string | undefined }, on = false) {
  const store = fakeDevModeStore(on);
  render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/']}>
        <InitialLocationContext value={true}>
          <DevModeProvider store={store} env={env}>
            <Routes>
              <Route path="/" element={<Entry />} />
            </Routes>
            <ToastProbe />
          </DevModeProvider>
        </InitialLocationContext>
      </MemoryRouter>
    </SessionProvider>,
  );
  return store;
}

const SEVEN_TAPS = 7;

describe('Entry', () => {
  // The chip arrives in developer mode's lazy chunk. Loading it here first
  // keeps the chip test about where the chip sits: under the full suite's
  // load, the chunk's first import in a worker can outlast `findByRole`'s
  // one-second wait.
  beforeAll(async () => {
    await import('../dev/registry');
  });

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

  it('shows the developer chip beside the wordmark while developer mode is on', async () => {
    render(
      <SessionProvider>
        <MemoryRouter initialEntries={['/']}>
          <InitialLocationContext value={true}>
            <DevModeProvider store={fakeDevModeStore(true)}>
              <DevSlotHost>
                <Routes>
                  <Route path="/" element={<Entry />} />
                </Routes>
              </DevSlotHost>
            </DevModeProvider>
          </InitialLocationContext>
        </MemoryRouter>
      </SessionProvider>,
    );
    const chip = await screen.findByRole('link', { name: 'Developer mode' });
    expect(chip).toHaveAttribute('href', '/dev');
    expect(
      screen.getByText('huemi').compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  describe('the wordmark', () => {
    async function tapWordmark(times: number) {
      const user = userEvent.setup();
      for (let i = 0; i < times; i++) await user.click(screen.getByText('huemi'));
    }

    it('opens the passphrase sheet after seven taps in passphrase mode', async () => {
      renderWithMode({ dev: false, hash: 'a'.repeat(64) });
      await tapWordmark(SEVEN_TAPS - 1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await tapWordmark(1);
      expect(await screen.findByRole('dialog', { name: 'Developer mode' })).toBeInTheDocument();
    });

    it('opens the passphrase sheet empty again after it was dismissed', async () => {
      renderWithMode({ dev: false, hash: 'a'.repeat(64) });
      await tapWordmark(SEVEN_TAPS);
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText('Passphrase'), 'half typed');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await tapWordmark(SEVEN_TAPS);
      expect(await screen.findByLabelText('Passphrase')).toHaveValue('');
    });

    it('turns developer mode on directly in direct mode', async () => {
      const store = renderWithMode({ dev: true, hash: undefined });
      await tapWordmark(SEVEN_TAPS);
      expect(store.value).toBe(true);
      expect(screen.getByTestId('toast')).toHaveTextContent('Developer mode on');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does nothing in none mode', async () => {
      const store = renderWithMode({ dev: false, hash: undefined });
      await tapWordmark(SEVEN_TAPS);
      expect(store.value).toBe(false);
      expect(screen.getByTestId('toast')).toBeEmptyDOMElement();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does nothing while developer mode is already on', async () => {
      renderWithMode({ dev: true, hash: undefined }, true);
      await tapWordmark(SEVEN_TAPS);
      expect(screen.getByTestId('toast')).toBeEmptyDOMElement();
    });

    it('does nothing without a provider', async () => {
      renderAt();
      await tapWordmark(SEVEN_TAPS);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('leads with the camera', () => {
    renderAt();
    const [photo, color, check, ...rest] = screen.getAllByRole('button');
    expect(photo).toHaveAccessibleName('Take a photo');
    expect(color).toHaveAccessibleName('Pick a color');
    expect(check).toHaveAccessibleName('Already dressed? Check your outfit');
    expect(rest).toEqual([]);
  });

  // The cards carry the line the start screen's paragraph used to say, as a
  // description, so the button's name stays the two words a user would say.
  it('says what each way in is for', () => {
    renderAt();
    expect(screen.getByRole('button', { name: 'Take a photo' })).toHaveAccessibleDescription(
      'of something you own',
    );
    expect(screen.getByRole('button', { name: 'Pick a color' })).toHaveAccessibleDescription(
      'if you know it',
    );
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

  it('shows no install link until the browser offers one', () => {
    renderAt();
    expect(screen.queryByRole('button', { name: 'Install huemi' })).not.toBeInTheDocument();
  });

  it('shows the install link below the other buttons once offered', () => {
    renderAt();
    act(() => void window.dispatchEvent(installOffer()));
    const buttons = screen.getAllByRole('button');
    expect(buttons.at(-1)).toHaveAccessibleName('Install huemi');
    expect(buttons).toHaveLength(4);
  });
});
