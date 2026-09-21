import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { vibrate } from './motion';

/** Horizontal travel that counts as a swipe rather than a tap. */
export const SWIPE_THRESHOLD_PX = 30;

/** How long a press has to be held to count. Matches the `hold` token. */
export const LONG_PRESS_MS = 450;

/**
 * Marks a control a press must be handed to rather than read as a gesture.
 *
 * Spread onto every button inside the block that owns its own presses, and
 * onto nothing else. It is load-bearing: the block's own surface is a button
 * too, so a guard phrased as "any button" would reject every press the block
 * can receive and the gestures would never run at all. Opting controls in one
 * by one is the only phrasing that survives a layout where the free area is
 * itself clickable.
 */
export const blockControl = { 'data-block-control': '' } as const;

const BLOCK_CONTROL_SELECTOR = '[data-block-control]';

type Gesture = {
  /** Which pointer this gesture belongs to, so a second finger cannot steal it. */
  pointerId: number;
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
 *
 * The caller has to mark its own controls with `blockControl`, because a press
 * that starts on one of them belongs to that control. Everything else in the
 * element is free area the gestures read, including a button that fills it —
 * which means the caller also owns suppressing the click that follows a
 * gesture on such a button.
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
  // from a layout effect, not assigned during render: eslint-plugin-react-hooks
  // 7's `react-hooks/refs` rule forbids writing a ref while rendering, even
  // for this store-the-latest-props pattern, so the write happens after
  // commit instead. It has to be `useLayoutEffect` rather than `useEffect`:
  // a passive effect is scheduled after the browser has painted, so a real
  // pointer event firing in that window would still read the previous
  // render's `enabled`/handlers — a block disabled the instant before a fast
  // second tap would still act on it. A layout effect runs synchronously in
  // the commit phase, before the browser can paint or dispatch anything, so
  // the ref is never stale for an event that arrives after commit.
  const latest = useRef({ onSwipe, onLongPress, enabled });
  useLayoutEffect(() => {
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
      // A second pointer moving while the first is still down must not be
      // read as the first pointer's travel.
      if (!active || event.pointerId !== active.pointerId) return;

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

      // Read again rather than trusting the check at pointerdown. A control
      // tapped by a second finger can disable the block while this finger is
      // still down, and the gesture that started when it was allowed would
      // otherwise land on a block that has since said no.
      if (!latest.current.enabled) {
        end();
        return;
      }

      // A leftward drag reveals the next suggestion, the way a stack of cards
      // moves. Rightward goes back; `advance` takes a signed delta and the
      // cursor is deliberately unbounded, so backwards needs nothing extra.
      latest.current.onSwipe(dx < 0 ? 1 : -1);
      end();
    }

    function handleUp(event: PointerEvent) {
      const active = gesture.current;
      // A second pointer releasing must not end the first pointer's gesture.
      if (!active || event.pointerId !== active.pointerId) return;
      end();
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    // No terminal event is guaranteed: press the mouse on the block, drag out
    // of the window and release there, and neither pointerup nor pointercancel
    // ever arrives. The gesture would stay open and every later right-click on
    // the block would be suppressed by a press that ended minutes ago.
    window.addEventListener('blur', end);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('blur', end);
    };
  }, [end]);

  // Nothing should outlive the component: a timer that fires after unmount
  // would call a handler belonging to a block that is no longer on screen.
  useEffect(() => end, [end]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Any new press on the block supersedes whatever was in flight. A second
      // pointer landing while the first is still down must not inherit the
      // first gesture's timer: without ending it here, finger A's timer would
      // fire at 450ms holding finger B's (unmoved, freshly started) gesture
      // object, counting as a long press for a touch held far less than that.
      // It runs before the guards below so that reaching for a control also
      // calls off a gesture the other hand had started.
      end();

      // A press that begins on one of the block's own controls belongs to that
      // control. Without this, tapping Next advances twice and holding it both
      // presses and keeps. Marked controls only, never any button: the block's
      // free area is a button too.
      if (event.target instanceof Element && event.target.closest(BLOCK_CONTROL_SELECTOR)) return;

      if (!latest.current.enabled) return;

      const startX = event.clientX;
      const startY = event.clientY;
      const active: Gesture = {
        pointerId: event.pointerId,
        startX,
        startY,
        pressed: false,
        moved: false,
        timer: setTimeout(() => {
          const current = gesture.current;
          if (!current || current.moved) return;
          // Re-read for the same reason the swipe does: the block may have
          // been disabled by a control tapped with the other hand while this
          // finger was still resting on it.
          if (!latest.current.enabled) {
            end();
            return;
          }
          current.pressed = true;
          // Haptics read the reduced-motion query themselves. Absent on iOS
          // Safari, where this degrades to nothing: the vibration carries no
          // information the padlock does not.
          vibrate(10);
          latest.current.onLongPress();
        }, LONG_PRESS_MS),
      };
      gesture.current = active;
    },
    [end],
  );

  const onContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    // A long press raises the context menu on touch, which would land on top
    // of the Keep it just triggered. Suppressed only while a press is running,
    // so a right-click anywhere else in the block still behaves normally.
    if (gesture.current) event.preventDefault();
  }, []);

  return { onPointerDown, onContextMenu };
}
