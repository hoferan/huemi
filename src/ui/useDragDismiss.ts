import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/** How far down the sheet has to be dragged to close on release alone. */
export const DISMISS_FRACTION = 0.25;

/**
 * How fast a shorter drag has to be travelling to count as a flick. There is
 * nothing in the handoff notes or the literature to derive this from; it is
 * set by feel and pinned here so a change to it is a change to a test.
 */
export const FLICK_PX_PER_MS = 0.5;

/**
 * How far a pointer has to travel before the press stops counting as a tap.
 * Small: this is not the dismissal threshold, only the line between a finger
 * that held still and one that dragged, and a thumb wobbles a pixel or two on
 * every tap.
 */
export const DRAG_SLOP_PX = 4;

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  // Updated on every move, because `pointerup` cannot be trusted to carry the
  // release position: a pointer released outside the window, or synthesised
  // without coordinates, still has to resolve against wherever the drag
  // actually last was.
  lastX: number;
  lastY: number;
};

/**
 * Drag-to-dismiss for the bottom sheet.
 *
 * Radix `Dialog` gives the focus trap, the escape key and the scrim, and no
 * drag at all, so this is the half that has to be written. It is its own hook
 * for the reason `useBlockGestures` is: the edge cases live here, and they are
 * worth testing without a sheet around them.
 *
 * Move and up are listened for on `window` rather than through
 * `setPointerCapture`, because jsdom does not implement capture and a hook
 * built on it could not be unit-tested at all.
 *
 * Height arrives as a function rather than a number so the caller can measure
 * the real element and a test can state one. Measuring inside the hook would
 * make every test depend on a layout jsdom does not perform.
 */
export function useDragDismiss({
  onDismiss,
  height,
}: {
  onDismiss: () => void;
  height: () => number;
}): {
  offset: number;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  dragged: () => boolean;
} {
  const [offset, setOffset] = useState(0);
  const drag = useRef<Drag | null>(null);
  // Whether the pointer travelled far enough for the press to have been a drag
  // rather than a tap. The handle is both the drag target and the tap-to-close
  // control, and a press and release inside it still produces a click, so
  // without this the sheet closes on a drag the hook decided to spring back.
  // Cleared at the start of every press, so it can never reach across two
  // sequences.
  const moved = useRef(false);

  // Registered once, so the listeners have to read the current callbacks
  // rather than the ones captured on the first render. Written from a layout
  // effect, not during render: react-hooks/refs forbids the latter, and a
  // passive effect would leave the ref stale for an event arriving before
  // paint.
  const latest = useRef({ onDismiss, height });
  useLayoutEffect(() => {
    latest.current = { onDismiss, height };
  });

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      const active = drag.current;
      if (!active || event.pointerId !== active.pointerId) return;
      active.lastX = event.clientX;
      active.lastY = event.clientY;
      const dy = event.clientY - active.startY;
      const dx = event.clientX - active.startX;
      // Before the checks below, not after: a sideways or upward drag is still
      // a drag, and the press that made it is still not a tap.
      if (Math.abs(dx) > DRAG_SLOP_PX || Math.abs(dy) > DRAG_SLOP_PX) moved.current = true;
      // A horizontal swipe is not a dismissal, and an upward drag has nowhere
      // to go: the sheet is already against the bottom.
      if (Math.abs(dx) > Math.abs(dy) || dy < 0) {
        setOffset(0);
        return;
      }
      setOffset(dy);
    }

    function handleUp(event: PointerEvent) {
      const active = drag.current;
      if (!active || event.pointerId !== active.pointerId) return;
      // From the tracked last move, not `event`: `pointerup` fires with its
      // own coordinates, but a release synthesised without them (or one that
      // lands outside the window) must still resolve against where the drag
      // actually ended.
      const travelled = active.lastY - active.startY;
      const dx = active.lastX - active.startX;
      drag.current = null;
      setOffset(0);

      if (Math.abs(dx) > Math.abs(travelled) || travelled <= 0) return;

      const far = travelled > latest.current.height() * DISMISS_FRACTION;
      // Date.now, not performance.now: Vitest's fake timers do not fake
      // performance by default, so a test that advances time would still
      // measure zero here and read every drag as a flick. Millisecond
      // resolution is ample against a 0.5 px/ms threshold.
      const elapsed = Math.max(1, Date.now() - active.startedAt);
      const fast = travelled / elapsed > FLICK_PX_PER_MS;
      if (far || fast) latest.current.onDismiss();
    }

    function cancel() {
      drag.current = null;
      setOffset(0);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', cancel);
    // Press, drag out of the window, release there, and neither pointerup nor
    // pointercancel arrives. Without this the sheet stays part-way open.
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
    };
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    moved.current = false;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: Date.now(),
      lastX: event.clientX,
      lastY: event.clientY,
    };
  }, []);

  /**
   * Whether the press that just ended was a drag. Reading it clears it, so one
   * drag can suppress at most one click: a drag released off the handle puts
   * its click somewhere else entirely, and the flag must not still be standing
   * when the handle is next activated.
   */
  const dragged = useCallback(() => {
    const was = moved.current;
    moved.current = false;
    return was;
  }, []);

  return { offset, onPointerDown, dragged };
}
