import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { parseHex } from '../model/hex';
import { SuggestionBlock } from './SuggestionBlock';

function setup(overrides: Partial<Parameters<typeof SuggestionBlock>[0]> = {}) {
  const props = {
    slot: 'bottom' as const,
    hex: parseHex('#3d3d3f'),
    position: '2 of 5',
    kept: false,
    onNext: vi.fn(),
    onKeepToggle: vi.fn(),
    onOpenAlternatives: vi.fn(),
    ...overrides,
  };
  render(<SuggestionBlock {...props} />);
  return props;
}

describe('SuggestionBlock', () => {
  it('offers all three controls by keyboard, so nothing depends on a gesture', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Other options for Bottom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Bottom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next suggestion for Bottom' })).toBeInTheDocument();
  });

  it('reports the position in words', () => {
    setup();
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
  });

  it('says nothing about the position when it is unknown', () => {
    setup({ position: null });
    // locate() returns null for a colour suggest() did not produce, and the
    // block omits the indicator rather than claiming a wrong place in a list.
    expect(screen.queryByText(/\bof\b/)).not.toBeInTheDocument();
  });

  it('carries the keep state on the toggle rather than in colour alone', () => {
    setup({ kept: true });
    expect(screen.getByRole('button', { name: 'Keep Bottom' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('stops offering another suggestion once the colour is kept', () => {
    setup({ kept: true });
    expect(screen.getByRole('button', { name: 'Next suggestion for Bottom' })).toBeDisabled();
  });

  it.each([
    ['Other options for Bottom', 'onOpenAlternatives'],
    ['Keep Bottom', 'onKeepToggle'],
    ['Next suggestion for Bottom', 'onNext'],
  ] as const)('calls %s handler when tapped', async (name, handler) => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name }));
    expect(props[handler]).toHaveBeenCalledOnce();
  });
});
