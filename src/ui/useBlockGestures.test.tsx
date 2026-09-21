import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tokensSource from '../styles/tokens.stylex.ts?raw';
import {
  blockControl,
  LONG_PRESS_MS,
  SWIPE_THRESHOLD_PX,
  useBlockGestures,
} from './useBlockGestures';

function Probe(props: Parameters<typeof useBlockGestures>[0]) {
  const gestures = useBlockGestures(props);
  return (
    <div data-testid="block" {...gestures}>
      <button type="button" {...blockControl}>
        Next suggestion for Bottom
      </button>
      {/* Unmarked on purpose: the caller's free area is a button too, and the
          guard has to let a press on it through. */}
      <button type="button">Other options for Bottom</button>
    </div>
  );
}

function pointer(type: string, x: number, y: number, pointerId = 1) {
  return new PointerEvent(type, { clientX: x, clientY: y, pointerId, bubbles: true });
}

function down(target: Element, x: number, y: number, pointerId = 1) {
  act(() => {
    target.dispatchEvent(pointer('pointerdown', x, y, pointerId));
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
  const { unmount } = render(
    <Probe onSwipe={onSwipe} onLongPress={onLongPress} enabled={enabled} />,
  );
  return { onSwipe, onLongPress, block: screen.getByTestId('block'), unmount };
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

describe('useBlockGestures — the context menu', () => {
  function contextMenu(target: Element) {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  }

  it('suppresses the menu a long press raises, which would land on top of Keep', () => {
    const { block } = setup();
    down(block, 100, 100);
    expect(contextMenu(block).defaultPrevented).toBe(true);
  });

  it('leaves a right-click alone when no press is running', () => {
    const { block } = setup();
    expect(contextMenu(block).defaultPrevented).toBe(false);
  });

  it('stops suppressing once the window loses focus mid-press', () => {
    // A terminal pointer event is not guaranteed: press, drag out of the
    // window, release there, and neither pointerup nor pointercancel arrives.
    // Without the blur listener the gesture stays open and swallows every
    // right-click on the block from then on.
    const { block } = setup();
    down(block, 100, 100);
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(contextMenu(block).defaultPrevented).toBe(false);
  });
});

describe('useBlockGestures — keeping clear of the marked controls', () => {
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

  it('reads a gesture that starts on an unmarked button', () => {
    // The guard cannot be phrased as "any button": the caller fills its block
    // with one, so a press on the colour field has to start a gesture or the
    // swipe and the long press are unreachable in a browser.
    const { onLongPress } = setup();
    down(screen.getByRole('button', { name: 'Other options for Bottom' }), 100, 100);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onLongPress).toHaveBeenCalledOnce();
  });
});

describe('useBlockGestures — unmounting mid-press', () => {
  it('does not fire the long press after the component has unmounted', () => {
    const { onLongPress, block, unmount } = setup();
    down(block, 100, 100);
    unmount();
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onLongPress).not.toHaveBeenCalled();
  });
});

describe('useBlockGestures — a second pointer', () => {
  it("does not let a second pointer inherit the first pointer's timer", () => {
    // Finger A goes down and starts its LONG_PRESS_MS timer. Finger B lands
    // 50ms later, before A lifts. Without ending A's gesture first, A's
    // timer would fire at its original deadline holding B's (unmoved,
    // freshly started) gesture object, crediting a press B had not yet held
    // for LONG_PRESS_MS.
    const { onLongPress, block } = setup();
    down(block, 200, 100, 1);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    down(block, 100, 100, 2);
    act(() => {
      // Past A's original deadline (50 + 401 = 451), but B has only been
      // down for 401ms of the 450ms it needs.
      vi.advanceTimersByTime(LONG_PRESS_MS - 50 + 1);
    });
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
