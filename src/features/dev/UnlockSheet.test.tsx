import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { DevModeProvider } from './DevModeProvider';
import { hashPassphrase } from './passphrase';
import { fakeDevModeStore } from './testing';
import { UnlockSheet } from './UnlockSheet';
import { useDevMode } from './useDevMode';

function Harness() {
  const [open, setOpen] = useState(true);
  const { on } = useDevMode();
  const { state } = useSession();
  return (
    <>
      <p>{on ? 'mode on' : 'mode off'}</p>
      <p>{state.toast?.message}</p>
      <UnlockSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderSheet(hash: string | undefined) {
  const store = fakeDevModeStore();
  render(
    <SessionProvider>
      <DevModeProvider store={store} env={{ dev: false, hash }}>
        <Harness />
      </DevModeProvider>
    </SessionProvider>,
  );
  return { store, user: userEvent.setup() };
}

describe('UnlockSheet', () => {
  it('unlocks with the right passphrase and closes', async () => {
    const { store, user } = renderSheet(await hashPassphrase('open sesame'));
    await user.type(screen.getByLabelText('Passphrase'), 'open sesame');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText('mode on')).toBeInTheDocument();
    expect(store.value).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Developer mode on')).toBeInTheDocument();
  });

  it('says the passphrase is not right and stays open', async () => {
    const { user } = renderSheet(await hashPassphrase('open sesame'));
    const field = screen.getByLabelText('Passphrase');
    await user.type(field, 'wrong');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That passphrase is not right.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('mode off')).toBeInTheDocument();
    expect(field).toHaveFocus();
  });

  it('marks the field invalid and points it at the message', async () => {
    const { user } = renderSheet(await hashPassphrase('open sesame'));
    const field = screen.getByLabelText('Passphrase');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(field).not.toHaveAccessibleDescription();
    await user.type(field, 'wrong');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    await screen.findByRole('alert');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('That passphrase is not right.');
  });

  // A screen reader announces an alert when it appears. The same node with the
  // same text says nothing, so each wrong attempt puts up a new one.
  it('announces a second wrong passphrase again', async () => {
    const { user } = renderSheet(await hashPassphrase('open sesame'));
    const field = screen.getByLabelText('Passphrase');
    await user.type(field, 'wrong');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    const first = await screen.findByRole('alert');
    await user.type(field, ' again');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(first));
    expect(first).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('That passphrase is not right.');
  });

  it('treats a failed check as not unlocked', async () => {
    // `crypto.subtle` is missing on an insecure origin, so hashing throws.
    const subtle = Object.getOwnPropertyDescriptor(globalThis.crypto, 'subtle');
    Object.defineProperty(globalThis.crypto, 'subtle', { value: undefined, configurable: true });
    try {
      const { user } = renderSheet('a'.repeat(64));
      await user.type(screen.getByLabelText('Passphrase'), 'anything');
      await user.click(screen.getByRole('button', { name: 'Unlock' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('That passphrase is not right.');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    } finally {
      if (subtle) Object.defineProperty(globalThis.crypto, 'subtle', subtle);
    }
  });
});
