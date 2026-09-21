import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHex } from '../model/hex';
import { SuggestionBlock } from './SuggestionBlock';
import { LONG_PRESS_MS, SWIPE_THRESHOLD_PX } from './useBlockGestures';

// The field's name is assembled from what is written on it, so it has to be
// spelled out here rather than derived, or the test would reproduce the bug it
// is holding. `#3d3d3f` is the palette's Charcoal.
const FIELD = 'Bottom, Charcoal, 2 of 5, other options';

type Props = Parameters<typeof SuggestionBlock>[0];

function setup(overrides: Partial<Props> = {}) {
  const props: Props = {
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
  const { rerender } = render(<SuggestionBlock {...props} />);
  return {
    ...props,
    rerender: (next: Partial<Props>) => {
      rerender(<SuggestionBlock {...props} {...next} />);
    },
  };
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

  // Dispatched on the colour field, because in a browser that is what the
  // pointer lands on: the field and the rail between them cover every pixel of
  // the block, so `role="group"` is never a pointer event's target. A test that
  // dispatched there would pass over a guard that rejects every real press.
  function field() {
    return screen.getByRole('button', { name: FIELD });
  }

  function down(target: Element, x: number) {
    act(() => {
      target.dispatchEvent(
        new PointerEvent('pointerdown', { clientX: x, clientY: 100, pointerId: 1, bubbles: true }),
      );
    });
  }

  function swipe(from: number, to: number, target = field()) {
    down(target, from);
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
    // The browser follows a press on a button with a click whatever the finger
    // did in between. jsdom does not synthesise it, so the test has to.
    fireEvent.click(target);
  }

  it('advances on a leftward swipe', () => {
    const props = setup();
    swipe(200, 200 - SWIPE_THRESHOLD_PX - 1);
    expect(props.onNext).toHaveBeenCalledOnce();
  });

  it('does not also open the alternatives sheet on the click the swipe releases into', () => {
    const props = setup();
    swipe(200, 200 - SWIPE_THRESHOLD_PX - 1);
    expect(props.onOpenAlternatives).not.toHaveBeenCalled();
  });

  it('goes back on a rightward swipe', () => {
    const props = setup();
    swipe(100, 100 + SWIPE_THRESHOLD_PX + 1);
    expect(props.onPrevious).toHaveBeenCalledOnce();
    expect(props.onOpenAlternatives).not.toHaveBeenCalled();
  });

  it('keeps the colour on a long press, and does not open alternatives as well', () => {
    vi.useFakeTimers();
    const props = setup();
    const target = field();
    down(target, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.click(target);
    expect(props.onKeepToggle).toHaveBeenCalledOnce();
    expect(props.onOpenAlternatives).not.toHaveBeenCalled();
  });

  it('still opens alternatives on a plain tap that neither moved nor was held', () => {
    vi.useFakeTimers();
    const props = setup();
    const target = field();
    down(target, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', { clientX: 100, clientY: 100, pointerId: 1, bubbles: true }),
      );
    });
    fireEvent.click(target);
    expect(props.onOpenAlternatives).toHaveBeenCalledOnce();
    expect(props.onNext).not.toHaveBeenCalled();
    expect(props.onKeepToggle).not.toHaveBeenCalled();
  });

  it('suppresses only the click the gesture produced, not the next tap', () => {
    const props = setup();
    swipe(200, 200 - SWIPE_THRESHOLD_PX - 1);
    expect(props.onOpenAlternatives).not.toHaveBeenCalled();
    const target = field();
    down(target, 100);
    fireEvent.click(target);
    expect(props.onOpenAlternatives).toHaveBeenCalledOnce();
  });

  it.each(['Keep Bottom', 'Next suggestion for Bottom'])(
    'starts no gesture from a press on %s',
    (name) => {
      vi.useFakeTimers();
      const props = setup();
      const control = screen.getByRole('button', { name });
      down(control, 200);
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS);
      });
      act(() => {
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 200 - SWIPE_THRESHOLD_PX - 1,
            clientY: 100,
            pointerId: 1,
            bubbles: true,
          }),
        );
      });
      expect(props.onKeepToggle).not.toHaveBeenCalled();
      expect(props.onNext).not.toHaveBeenCalled();
      expect(props.onPrevious).not.toHaveBeenCalled();
    },
  );

  it('ignores a swipe once the colour is kept', () => {
    const props = setup({ kept: true });
    swipe(200, 200 - SWIPE_THRESHOLD_PX - 1);
    expect(props.onNext).not.toHaveBeenCalled();
  });

  it('ignores a long press once the colour is kept', () => {
    vi.useFakeTimers();
    const props = setup({ kept: true });
    down(field(), 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(props.onKeepToggle).not.toHaveBeenCalled();
  });

  it('drops a long press the block was disabled part-way through', () => {
    // A thumb resting on the colour while the other hand taps Keep. The tap
    // is handed to the button, so the thumb's gesture is still running; 450ms
    // later it would toggle Keep a second time and un-keep the block the user
    // just kept.
    vi.useFakeTimers();
    const props = setup();
    down(field(), 100);
    act(() => {
      props.rerender({ kept: true });
    });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(props.onKeepToggle).not.toHaveBeenCalled();
  });

  it('drops a swipe the block was disabled part-way through', () => {
    const props = setup();
    down(field(), 200);
    act(() => {
      props.rerender({ kept: true });
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 200 - SWIPE_THRESHOLD_PX - 1,
          clientY: 100,
          pointerId: 1,
          bubbles: true,
        }),
      );
    });
    expect(props.onNext).not.toHaveBeenCalled();
  });
});
