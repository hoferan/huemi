import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { vibrate } from './motion';

/** Horizontal travel that counts as a swipe rather than a tap. */
export const SWIPE_THRESHOLD_PX = 30;

/** How long a press has to be held to count. Matches the `hold` token. */
export const LONG_PRESS_MS = 450;

type Gesture = {
  startX: number;
  startY: number;
  /** Set once the press has counted, so the release cannot also swipe. */
  pressed: boolean;
  /** Set once the finger has wandered, so the timer cannot also press. */
  moved: boolean;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * The whole pointer sequence for one block, in one hook.
 *
 * Two hooks — one for the swipe, one for the press — would both attach to
 * `pointerdown` and both claim the same gesture, so a held finger that then
 * slid would fire Keep and a colour change. One owner can decide: a press that
 * wanders is a swipe, a press that does not is a press, and once either has
 * counted the other is out.
 *
 * Move and up are listened for on `window` rather than through
 * `setPointerCapture`. Capture is the textbook approach, but jsdom does not
 * implement it, so a hook built on it could not be unit-tested at all — it
 * would throw on the first `pointerdown`. Window listeners see the pointer
 * after it leaves the element just the same, which is the only thing capture
 * was buying here.
 *
 * Gestures are pointer events, not touch events, so a mouse and a stylus get
 * the same behaviour without a second code path.
 */
export function useBlockGestures({
  onSwipe,
  onLongPress,
  enabled,
}: {
  onSwipe: (delta: 1 | -1) => void;
  onLongPress: () => void;
  enabled: boolean;
}): {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
} {
  const gesture = useRef<Gesture | null>(null);

  // Held in a ref so the window listeners, registered once, always call the
  // current handlers rather than the ones captured on first render. Synced
  // from an effect, not assigned during render: eslint-plugin-react-hooks 7's
  // `react-hooks/refs` rule forbids writing a ref while rendering, even for
  // this store-the-latest-props pattern, so the write happens after commit
  // instead. Every render still refreshes it, before the next event can read
  // it.
  const latest = useRef({ onSwipe, onLongPress, enabled });
  useEffect(() => {
    latest.current = { onSwipe, onLongPress, enabled };
  });

  const end = useCallback(() => {
    const active = gesture.current;
    if (!active) return;
    clearTimeout(active.timer);
    gesture.current = null;
  }, []);

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      const active = gesture.current;
      if (!active) return;

      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;

      // Any real travel rules out a press, whichever way it went.
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        active.moved = true;
        clearTimeout(active.timer);
      }

      if (active.pressed) return;

      // Vertical dominance aborts. The prototype never reads clientY, so
      // scrolling the page changes colours under the finger.
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (Math.abs(dx) <= SWIPE_THRESHOLD_PX) return;

      // A leftward drag reveals the next suggestion, the way a stack of cards
      // moves. Rightward goes back; `advance` takes a signed delta and the
      // cursor is deliberately unbounded, so backwards needs nothing extra.
      latest.current.onSwipe(dx < 0 ? 1 : -1);
      end();
    }

    function handleUp() {
      end();
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [end]);

  // Nothing should outlive the component: a timer that fires after unmount
  // would call a handler belonging to a block that is no longer on screen.
  useEffect(() => end, [end]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!latest.current.enabled) return;

    // A press that begins on one of the block's own buttons belongs to that
    // button. Without this, tapping Next advances twice and holding it both
    // presses and keeps.
    if (event.target instanceof Element && event.target.closest('button')) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const active: Gesture = {
      startX,
      startY,
      pressed: false,
      moved: false,
      timer: setTimeout(() => {
        const current = gesture.current;
        if (!current || current.moved) return;
        current.pressed = true;
        // Haptics read the reduced-motion query themselves. Absent on iOS
        // Safari, where this degrades to nothing: the vibration carries no
        // information the padlock does not.
        vibrate(10);
        latest.current.onLongPress();
      }, LONG_PRESS_MS),
    };
    gesture.current = active;
  }, []);

  const onContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    // A long press raises the context menu on touch, which would land on top
    // of the Keep it just triggered. Suppressed only while a press is running,
    // so a right-click anywhere else in the block still behaves normally.
    if (gesture.current) event.preventDefault();
  }, []);

  return { onPointerDown, onContextMenu };
}
