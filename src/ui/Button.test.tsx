import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders a button that is not a submit', () => {
    render(<Button label="Start" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Start' })).toHaveAttribute('type', 'button');
  });

  it('calls its handler once per click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button label="Start" onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
