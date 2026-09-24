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

  it('is a primary button unless told otherwise', () => {
    render(<Button label="Go" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Go' })).not.toHaveAttribute('aria-expanded');
  });

  it('can say it controls a region and whether that region is open', () => {
    render(
      <Button
        label="Not quite"
        variant="secondary"
        expanded={false}
        controls="panel"
        onClick={() => {}}
      />,
    );
    const button = screen.getByRole('button', { name: 'Not quite' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'panel');
  });
});
