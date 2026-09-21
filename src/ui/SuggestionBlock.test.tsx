import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHex } from '../model/hex';
import { SuggestionBlock } from './SuggestionBlock';
import { LONG_PRESS_MS, SWIPE_THRESHOLD_PX } from './useBlockGestures';

// The field's name is assembled from what is written on it, so it has to be
// spelled out here rather than derived, or the test would reproduce the bug it
// is holding. `#3d3d3f` is the palette's Charcoal.
const FIELD = 'Bottom, Charcoal, 2 of 5, other options';

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
    expect(screen.getByRole('button', { name: FIELD })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Bottom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next suggestion for Bottom' })).toBeInTheDocument();
  });

  it('reports the position in the name, which is the only part a screen reader reads', () => {
    // An aria-label replaces a button's contents for naming, so the "2 of 5"
    // span inside the field is announced by nobody unless the name carries it.
    // Asserted on the accessible name and not with getByText for that reason:
    // the text query passes whether or not anything can reach it.
    setup();
    expect(screen.getByRole('button', { name: FIELD })).toHaveAccessibleName(FIELD);
  });

  it('names the field with its own visible text, so a voice command can reach it', () => {
    // WCAG 2.5.3: the visible words have to be in the name, in order, or
    // "click Charcoal" activates nothing.
    setup();
    const field = screen.getByRole('button', { name: FIELD });
    for (const visible of ['Bottom', 'Charcoal', '2 of 5']) {
      expect(field.textContent).toContain(visible);
      expect(field).toHaveAccessibleName(new RegExp(visible));
    }
  });

  it('says nothing about the position when it is unknown', () => {
    setup({ position: null });
    // locate() returns null for a colour suggest() did not produce, and the
    // block omits the indicator rather than claiming a wrong place in a list.
    // The name loses the segment outright rather than keeping an empty one.
    expect(screen.queryByText(/\bof\b/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Bottom, Charcoal, other options' }),
    ).toBeInTheDocument();
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
    [FIELD, 'onOpenAlternatives'],
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
