import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RunSetup } from './RunSetup';

describe('RunSetup', () => {
  it('asks for a length before starting', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<RunSetup withLight={false} onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText('Choose a length')).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('asks for the light when the run needs one', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<RunSetup withLight onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText('Choose the light')).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('starts with the length and light chosen', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<RunSetup withLight onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: 'Lamp' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith({ length: 20, light: 'lamp' });
  });

  it('starts with no light when the run has none', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<RunSetup withLight={false} onStart={onStart} />);
    expect(screen.queryByRole('group', { name: 'Light' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '10' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith({ length: 10, light: null });
  });

  it('keeps Start enabled', () => {
    render(<RunSetup withLight onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  });
});
