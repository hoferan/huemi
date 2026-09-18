import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Announcer, useAnnounce } from './Announcer';

function Speaker() {
  const announce = useAnnounce();
  return (
    <button type="button" onClick={() => announce('Outfit saved')}>
      speak
    </button>
  );
}

describe('Announcer', () => {
  it('renders an empty polite live region', () => {
    render(
      <Announcer>
        <p>content</p>
      </Announcer>,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('');
  });

  it('puts an announced message into the live region', async () => {
    const user = userEvent.setup();
    render(
      <Announcer>
        <Speaker />
      </Announcer>,
    );
    await user.click(screen.getByRole('button', { name: 'speak' }));
    expect(screen.getByRole('status')).toHaveTextContent('Outfit saved');
  });

  it('throws when useAnnounce is called outside the provider', () => {
    expect(() => render(<Speaker />)).toThrow('useAnnounce needs an Announcer above it');
  });

  it('changes the live region on every repeated announcement, not just the first', async () => {
    const user = userEvent.setup();
    render(
      <Announcer>
        <Speaker />
      </Announcer>,
    );
    const button = screen.getByRole('button', { name: 'speak' });
    const region = screen.getByRole('status');

    await user.click(button);
    const first = region.textContent;
    await user.click(button);
    const second = region.textContent;
    await user.click(button);
    const third = region.textContent;

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
  });
});
