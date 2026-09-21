import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHex } from '../model/hex';
import { SuggestionBlock } from './SuggestionBlock';
import { LONG_PRESS_MS, SWIPE_THRESHOLD_PX } from './useBlockGestures';

function setup(overrides: Partial<Parameters<typeof SuggestionBlock>[0]> = {}) {
  const props = {
    slot: 'bottom' as const,
    hex: parseHex('#3d3d3f'),
    position: '2 of 5',
    kept: false,
    onNext: vi.fn(),
    onKeepToggle: vi.fn(),
    onOpenAlternatives: vi.fn(),
    onPrevious: vi.fn(),
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

describe('SuggestionBlock — gestures over the controls', () => {
  // Restored unconditionally: a test below uses fake timers, and if it threw
  // before reaching its own cleanup, every test after it would silently
  // inherit fake timers and fail for reasons unrelated to them.
  afterEach(() => {
    vi.useRealTimers();
  });

  function swipe(from: number, to: number) {
    const block = screen.getByRole('group');
    act(() => {
      block.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: from,
          clientY: 100,
          pointerId: 1,
          bubbles: true,
        }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', { clientX: to, clientY: 100, pointerId: 1, bubbles: true }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', { clientX: to, clientY: 100, pointerId: 1, bubbles: true }),
      );
    });
  }

  it('advances on a leftward swipe', () => {
    const props = setup({ onPrevious: vi.fn() });
    swipe(200, 200 - SWIPE_THRESHOLD_PX - 1);
    expect(props.onNext).toHaveBeenCalledOnce();
  });

  it('goes back on a rightward swipe', () => {
    const onPrevious = vi.fn();
    setup({ onPrevious });
    swipe(100, 100 + SWIPE_THRESHOLD_PX + 1);
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it('keeps the colour on a long press, which is the gesture Keep also does', () => {
    vi.useFakeTimers();
    const props = setup({ onPrevious: vi.fn() });
    const block = screen.getByRole('group');
    act(() => {
      block.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          bubbles: true,
        }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(props.onKeepToggle).toHaveBeenCalledOnce();
  });

  it('ignores a swipe once the colour is kept', () => {
    const props = setup({ kept: true, onPrevious: vi.fn() });
    swipe(200, 200 - SWIPE_THRESHOLD_PX - 1);
    expect(props.onNext).not.toHaveBeenCalled();
  });
});
