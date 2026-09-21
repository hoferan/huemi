import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { SessionProvider } from './SessionProvider';
import { useSession } from './useSession';

function Probe() {
  const { state, dispatch } = useSession();
  return (
    <>
      <p>base: {state.base?.hex ?? 'none'}</p>
      <button
        type="button"
        onClick={() => dispatch({ type: 'baseChosen', slot: 'bottom', hex: parseHex('#1f2a44') })}
      >
        choose
      </button>
    </>
  );
}

describe('useSession', () => {
  it('starts with no base and records one when dispatched', async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByText('base: none')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'choose' }));
    expect(screen.getByText('base: #1f2a44')).toBeInTheDocument();
  });

  it('throws when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useSession needs a SessionProvider above it');
  });
});
