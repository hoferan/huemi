import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DevModeStore } from '../../storage/port';
import { DevModeProvider } from './DevModeProvider';
import { hashPassphrase } from './passphrase';
import { fakeDevModeStore } from './testing';
import { useDevMode } from './useDevMode';

type Env = { dev: boolean; hash: string | undefined };
const DIRECT: Env = { dev: true, hash: undefined };

function Probe() {
  const { on, method, unlock, tryPassphrase, lock } = useDevMode();
  return (
    <>
      <p>{`on ${on} method ${method}`}</p>
      <button type="button" onClick={unlock}>
        unlock
      </button>
      <button type="button" onClick={lock}>
        lock
      </button>
      <button
        type="button"
        onClick={() => void tryPassphrase('correct horse').then((ok) => (document.title = `${ok}`))}
      >
        right
      </button>
      <button
        type="button"
        onClick={() =>
          void tryPassphrase('battery staple').then((ok) => (document.title = `${ok}`))
        }
      >
        wrong
      </button>
    </>
  );
}

function setup(store: DevModeStore, env: Env) {
  render(
    <DevModeProvider store={store} env={env}>
      <Probe />
    </DevModeProvider>,
  );
  return userEvent.setup();
}

describe('DevModeProvider', () => {
  beforeEach(() => {
    document.title = '';
  });

  it('defaults to off without a provider', () => {
    render(<Probe />);
    expect(screen.getByText('on false method none')).toBeInTheDocument();
  });

  it('starts on when the store says so', () => {
    setup(fakeDevModeStore(true), DIRECT);
    expect(screen.getByText('on true method direct')).toBeInTheDocument();
  });

  it('unlock turns it on and persists in direct mode', async () => {
    const store = fakeDevModeStore();
    const user = setup(store, DIRECT);
    await user.click(screen.getByRole('button', { name: 'unlock' }));
    expect(screen.getByText('on true method direct')).toBeInTheDocument();
    expect(store.value).toBe(true);
  });

  it('unlock does nothing in passphrase mode', async () => {
    const store = fakeDevModeStore();
    const user = setup(store, { dev: false, hash: 'ab' });
    await user.click(screen.getByRole('button', { name: 'unlock' }));
    expect(screen.getByText('on false method passphrase')).toBeInTheDocument();
    expect(store.value).toBe(false);
  });

  it('tryPassphrase with the right passphrase turns it on and resolves true', async () => {
    const store = fakeDevModeStore();
    const user = setup(store, { dev: false, hash: await hashPassphrase('correct horse') });
    await user.click(screen.getByRole('button', { name: 'right' }));
    await waitFor(() => expect(document.title).toBe('true'));
    expect(screen.getByText('on true method passphrase')).toBeInTheDocument();
    expect(store.value).toBe(true);
  });

  // A hash pasted into a deploy setting can pick up case or spaces on the way.
  it('accepts a hash given in uppercase with spaces around it', async () => {
    const store = fakeDevModeStore();
    const hash = ` ${(await hashPassphrase('correct horse')).toUpperCase()} 
`;
    const user = setup(store, { dev: false, hash });
    await user.click(screen.getByRole('button', { name: 'right' }));
    await waitFor(() => expect(document.title).toBe('true'));
    expect(store.value).toBe(true);
  });

  it('treats a hash of only spaces as none', () => {
    setup(fakeDevModeStore(), { dev: false, hash: '   ' });
    expect(screen.getByText('on false method none')).toBeInTheDocument();
  });

  it('tryPassphrase with a wrong one resolves false and stays off', async () => {
    const store = fakeDevModeStore();
    const user = setup(store, { dev: false, hash: await hashPassphrase('correct horse') });
    await user.click(screen.getByRole('button', { name: 'wrong' }));
    await waitFor(() => expect(document.title).toBe('false'));
    expect(screen.getByText('on false method passphrase')).toBeInTheDocument();
    expect(store.value).toBe(false);
  });

  it('tryPassphrase resolves false when there is no hash', async () => {
    const user = setup(fakeDevModeStore(), { dev: false, hash: undefined });
    await user.click(screen.getByRole('button', { name: 'wrong' }));
    await waitFor(() => expect(document.title).toBe('false'));
  });

  it('lock turns it off and persists', async () => {
    const store = fakeDevModeStore(true);
    const user = setup(store, DIRECT);
    await user.click(screen.getByRole('button', { name: 'lock' }));
    expect(screen.getByText('on false method direct')).toBeInTheDocument();
    expect(store.value).toBe(false);
  });

  it('unlocks for the session when storage throws', async () => {
    const store: DevModeStore = {
      isOn: () => false,
      setOn: () => {
        throw new Error('denied');
      },
    };
    const user = setup(store, DIRECT);
    await user.click(screen.getByRole('button', { name: 'unlock' }));
    expect(screen.getByText('on true method direct')).toBeInTheDocument();
  });
});
