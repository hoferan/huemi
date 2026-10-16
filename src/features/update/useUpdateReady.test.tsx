import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistration, fakeWorker } from './registration.testing';
import { useUpdateReady, watchForUpdates } from './useUpdateReady';

const HOUR = 60 * 60 * 1000;

let stop: (() => void) | undefined;

function watch(...args: Parameters<typeof watchForUpdates>) {
  stop = watchForUpdates(...args);
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  act(() => stop?.());
  stop = undefined;
  setVisibility('visible');
});

describe('useUpdateReady', () => {
  it('has nothing to offer while no new version waits', () => {
    watch(fakeRegistration({ active: fakeWorker('activated') }));
    const { result } = renderHook(() => useUpdateReady());
    expect(result.current.ready).toBe(false);
  });

  it('offers a version that was already waiting when the app opened', () => {
    watch(fakeRegistration({ active: fakeWorker('activated'), waiting: fakeWorker('installed') }));
    const { result } = renderHook(() => useUpdateReady());
    expect(result.current.ready).toBe(true);
  });

  it('offers a new version once it has finished installing', () => {
    const registration = fakeRegistration({ active: fakeWorker('activated') });
    watch(registration);
    const { result } = renderHook(() => useUpdateReady());
    const next = fakeWorker('installing');
    act(() => registration.find(next));
    expect(result.current.ready).toBe(false);
    act(() => next.become('installed'));
    expect(result.current.ready).toBe(true);
  });

  it('offers nothing when the first version installs, since nothing older is running', () => {
    const registration = fakeRegistration({});
    watch(registration);
    const { result } = renderHook(() => useUpdateReady());
    const first = fakeWorker('installing');
    act(() => registration.find(first));
    act(() => first.become('installed'));
    expect(result.current.ready).toBe(false);
  });

  it('offers nothing when the new version is gone before its update is seen', () => {
    // A worker that fails to install becomes redundant, and the browser can
    // clear `installing` before the page handles updatefound.
    const registration = fakeRegistration({ active: fakeWorker('activated') });
    watch(registration);
    const { result } = renderHook(() => useUpdateReady());
    act(() => void registration.dispatchEvent(new Event('updatefound')));
    expect(result.current.ready).toBe(false);
  });

  it('asks the waiting version to take over, and reloads only once it has', () => {
    const waiting = fakeWorker('installed');
    const container = new EventTarget();
    const reload = vi.fn();
    watch(fakeRegistration({ active: fakeWorker('activated'), waiting }), { container, reload });
    const { result } = renderHook(() => useUpdateReady());
    result.current.restart();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'skip-waiting' });
    expect(reload).not.toHaveBeenCalled();
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload when another window lets a new version take over', () => {
    const container = new EventTarget();
    const reload = vi.fn();
    watch(fakeRegistration({ active: fakeWorker('activated'), waiting: fakeWorker('installed') }), {
      container,
      reload,
    });
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });

  it('checks for a new version when brought back after an hour or more', () => {
    let now = 0;
    const registration = fakeRegistration({ active: fakeWorker('activated') });
    watch(registration, { now: () => now });
    setVisibility('hidden');
    now = HOUR;
    setVisibility('visible');
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it('does not check again within the hour', () => {
    let now = 0;
    const registration = fakeRegistration({ active: fakeWorker('activated') });
    watch(registration, { now: () => now });
    now = HOUR - 1;
    setVisibility('visible');
    expect(registration.update).not.toHaveBeenCalled();
    now = HOUR;
    setVisibility('visible');
    now = 2 * HOUR - 1;
    setVisibility('visible');
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it('does not check when the app goes into the background', () => {
    let now = 0;
    const registration = fakeRegistration({ active: fakeWorker('activated') });
    watch(registration, { now: () => now });
    now = HOUR;
    setVisibility('hidden');
    expect(registration.update).not.toHaveBeenCalled();
  });

  it('carries on when the check fails offline', async () => {
    let now = 0;
    const registration = fakeRegistration({ active: fakeWorker('activated') });
    registration.update = () => Promise.reject(new TypeError('Failed to fetch'));
    watch(registration, { now: () => now });
    now = HOUR;
    setVisibility('visible');
    // Vitest fails the run on an unhandled rejection, so let it surface here.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
