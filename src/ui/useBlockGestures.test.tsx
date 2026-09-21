import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tokensSource from '../styles/tokens.stylex.ts?raw';
import { LONG_PRESS_MS, SWIPE_THRESHOLD_PX, useBlockGestures } from './useBlockGestures';

function Probe(props: Parameters<typeof useBlockGestures>[0]) {
  const gestures = useBlockGestures(props);
  return (
    <div data-testid="block" {...gestures}>
      <button type="button">Next suggestion for Bottom</button>
    </div>
  );
}

function pointer(type: string, x: number, y: number) {
  return new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true });
}

function down(target: Element, x: number, y: number) {
  act(() => {
    target.dispatchEvent(pointer('pointerdown', x, y));
  });
}

// Move and up are dispatched on window because the hook listens there rather
// than using setPointerCapture, which this jsdom does not implement.
function move(x: number, y: number) {
  act(() => {
    window.dispatchEvent(pointer('pointermove', x, y));
  });
}

function up(x: number, y: number) {
  act(() => {
    window.dispatchEvent(pointer('pointerup', x, y));
  });
}

function setup(enabled = true) {
  const onSwipe = vi.fn();
  const onLongPress = vi.fn();
  render(<Probe onSwipe={onSwipe} onLongPress={onLongPress} enabled={enabled} />);
  return { onSwipe, onLongPress, block: screen.getByTestId('block') };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBlockGestures — swipe', () => {
  it('advances on a leftward drag past the threshold', () => {
    const { onSwipe, block } = setup();
    down(block, 200, 100);
    move(200 - SWIPE_THRESHOLD_PX - 1, 100);
    up(200 - SWIPE_THRESHOLD_PX - 1, 100);
    expect(onSwipe).toHaveBeenCalledWith(1);
  });

  it('goes back on a rightward drag past the threshold', () => {
    const { onSwipe, block } = setup();
    down(block, 100, 100);
    move(100 + SWIPE_THRESHOLD_PX + 1, 100);
    up(100 + SWIPE_THRESHOLD_PX + 1, 100);
    expect(onSwipe).toHaveBeenCalledWith(-1);
  });

  it('ignores a drag that does not reach the threshold', () => {
    const { onSwipe, block } = setup();
    down(block, 200, 100);
    move(200 - SWIPE_THRESHOLD_PX + 1, 100);
    up(200 - SWIPE_THRESHOLD_PX + 1, 100);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('ignores a drag where vertical movement dominates, however far it travels', () => {
    // The prototype reads clientX and never clientY, so scrolling the page
    // changes colours under the finger. This is that bug, pinned.
    const { onSwipe, block } = setup();
    down(block, 200, 100);
    move(200 - SWIPE_THRESHOLD_PX - 20, 100 + SWIPE_THRESHOLD_PX + 80);
    up(200 - SWIPE_THRESHOLD_PX - 20, 100 + SWIPE_THRESHOLD_PX + 80);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('does nothing at all while disabled', () => {
    const { onSwipe, onLongPress, block } = setup(false);
    down(block, 200, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS + 50);
    });
    move(200 - SWIPE_THRESHOLD_PX - 1, 100);
    up(200 - SWIPE_THRESHOLD_PX - 1, 100);
    expect(onSwipe).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});

describe('useBlockGestures — long press', () => {
  it('fires once the press has been held long enough', () => {
    const { onLongPress, block } = setup();
    down(block, 100, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it('does not fire on a press let go too soon', () => {
    const { onLongPress, block } = setup();
    down(block, 100, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    });
    up(100, 100);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does not fire when the finger wandered, because that was a swipe', () => {
    const { onLongPress, block } = setup();
    down(block, 200, 100);
    move(200 - SWIPE_THRESHOLD_PX - 1, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does not fire a swipe as well, once the press has counted', () => {
    const { onSwipe, onLongPress, block } = setup();
    down(block, 200, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    move(200 - SWIPE_THRESHOLD_PX - 1, 100);
    up(200 - SWIPE_THRESHOLD_PX - 1, 100);
    expect(onLongPress).toHaveBeenCalledOnce();
    expect(onSwipe).not.toHaveBeenCalled();
  });
});

describe('LONG_PRESS_MS', () => {
  it('stays equal to the hold token, which is the same 450ms in CSS units', () => {
    // Two representations of one number: the token is a CSS duration string
    // and the timer needs a number, so neither can be derived from the other
    // at runtime. Without this they drift silently and the press stops
    // matching whatever animation the token drives. `?raw` for the same
    // reason tokens.stylex.test.ts uses it — StyleX rewrites defineVars
    // values into var() references even under Vitest.
    const hold = /hold:\s*'(\d+)ms'/.exec(tokensSource)?.[1];
    expect(hold).toBeDefined();
    expect(Number(hold)).toBe(LONG_PRESS_MS);
  });
});

describe('useBlockGestures — keeping clear of the buttons', () => {
  it('ignores a gesture that starts on a control', () => {
    // The controls are inside the block, so a press on one bubbles up here.
    // Without this the spec's "keep a gesture from firing on top of a button
    // press" is unmet and a tap on Next would advance twice.
    const { onSwipe, onLongPress, block } = setup();
    const button = screen.getByRole('button', { name: 'Next suggestion for Bottom' });
    down(button, 200, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    move(200 - SWIPE_THRESHOLD_PX - 1, 100);
    up(200 - SWIPE_THRESHOLD_PX - 1, 100);
    expect(onSwipe).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
    expect(block).toBeInTheDocument();
  });
});
