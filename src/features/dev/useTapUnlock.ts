import { useCallback, useRef } from 'react';

export const UNLOCK_TAPS = 7;
export const UNLOCK_WINDOW_MS = 3000;

/**
 * A tap handler that calls `onUnlock` when `UNLOCK_TAPS` taps fall within
 * `UNLOCK_WINDOW_MS`, then starts counting again.
 *
 * It keeps the times of the last seven taps and compares the newest with the
 * oldest, so the window rolls: six taps, a pause and one more do not add up,
 * and a slow start does not spoil a fast finish. `now` is a parameter so a
 * test can drive the clock.
 */
export function useTapUnlock(onUnlock: () => void, now: () => number = Date.now): () => void {
  const taps = useRef<number[]>([]);

  return useCallback(() => {
    const times = [...taps.current, now()].slice(-UNLOCK_TAPS);
    const [oldest] = times;
    const newest = times[times.length - 1];
    if (
      times.length === UNLOCK_TAPS &&
      oldest !== undefined &&
      newest !== undefined &&
      newest - oldest <= UNLOCK_WINDOW_MS
    ) {
      taps.current = [];
      onUnlock();
      return;
    }
    taps.current = times;
  }, [onUnlock, now]);
}
