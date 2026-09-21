import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, vibrate } from './motion';

// jsdom implements neither of these, which is convenient: `navigator.vibrate`
// being undefined is exactly the iOS Safari case, so the guard is exercised
// by the default environment rather than by a mock pretending to be one.
function stubQuery(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prefersReducedMotion', () => {
  it('is false when the browser cannot answer', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reports what the query says', () => {
    stubQuery(true);
    expect(prefersReducedMotion()).toBe(true);
    stubQuery(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reads the query at call time, so changing the setting takes effect', () => {
    stubQuery(false);
    expect(prefersReducedMotion()).toBe(false);
    stubQuery(true);
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('vibrate', () => {
  it('does nothing when the device has no vibrator', () => {
    stubQuery(false);
    expect(() => vibrate(10)).not.toThrow();
  });

  it('vibrates when motion is welcome', () => {
    const spy = vi.fn();
    vi.stubGlobal('navigator', { vibrate: spy });
    stubQuery(false);
    vibrate(10);
    expect(spy).toHaveBeenCalledWith(10);
  });

  it('stays still when the user asked for less motion', () => {
    const spy = vi.fn();
    vi.stubGlobal('navigator', { vibrate: spy });
    stubQuery(true);
    vibrate(10);
    expect(spy).not.toHaveBeenCalled();
  });
});
