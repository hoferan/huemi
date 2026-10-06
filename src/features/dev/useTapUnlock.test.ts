import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UNLOCK_TAPS, UNLOCK_WINDOW_MS, useTapUnlock } from './useTapUnlock';

function setup() {
  let clock = 0;
  const onUnlock = vi.fn();
  const { result } = renderHook(() => useTapUnlock(onUnlock, () => clock));
  const tapAt = (ms: number) => {
    clock = ms;
    result.current();
  };
  return { onUnlock, tapAt };
}

describe('useTapUnlock', () => {
  it('unlocks on seven taps within three seconds', () => {
    const { onUnlock, tapAt } = setup();
    for (let i = 0; i < UNLOCK_TAPS - 1; i++) tapAt(i * 400);
    expect(onUnlock).not.toHaveBeenCalled();
    tapAt((UNLOCK_TAPS - 1) * 400);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('ignores seven taps spread over more than the window', () => {
    const { onUnlock, tapAt } = setup();
    // Steps of 600 ms put the seventh tap at 3600, past the window.
    for (let i = 0; i < UNLOCK_TAPS; i++) tapAt(i * 600);
    expect(onUnlock).not.toHaveBeenCalled();
    expect(UNLOCK_WINDOW_MS).toBe(3000);
  });

  it('counts a rolling window', () => {
    const { onUnlock, tapAt } = setup();
    // Six fast taps, a pause, then one: the old six no longer count.
    for (let i = 0; i < 6; i++) tapAt(i * 100);
    tapAt(4000);
    expect(onUnlock).not.toHaveBeenCalled();
    // Six more by 4600 make seven within 600 ms of the one at 4000.
    for (let i = 1; i <= 6; i++) tapAt(4000 + i * 100);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('starts over after unlocking', () => {
    const { onUnlock, tapAt } = setup();
    for (let i = 0; i < UNLOCK_TAPS * 2; i++) tapAt(i * 10);
    expect(onUnlock).toHaveBeenCalledTimes(2);
  });

  it('accepts the seventh tap exactly one window after the first', () => {
    const { onUnlock, tapAt } = setup();
    for (let i = 0; i < UNLOCK_TAPS - 1; i++) tapAt(i * 100);
    tapAt(UNLOCK_WINDOW_MS);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});
