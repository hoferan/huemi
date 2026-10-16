import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StorageResult } from '../../../storage/port';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import { useRunGuard } from './useRunGuard';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

const ok: StorageResult<void> = { ok: true, value: undefined };
const failed: StorageResult<void> = { ok: false, reason: 'test' };

/** A call that stays out until `finish` is called. */
function held() {
  let finish: (result: StorageResult<void>) => void = () => {};
  const call = vi.fn(
    () =>
      new Promise<StorageResult<void>>((resolve) => {
        finish = resolve;
      }),
  );
  return { call, finish: (result: StorageResult<void>) => finish(result) };
}

function setup() {
  const dispatch = vi.fn();
  const view = renderHook(
    () => ({ guard: useRunGuard<string>(dispatch), toast: useSession().state.toast }),
    { wrapper },
  );
  return { dispatch, view };
}

describe('useRunGuard', () => {
  it('ignores a second call while one is in flight', async () => {
    const { view } = setup();
    const first = held();
    const second = vi.fn(() => Promise.resolve(ok));
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = view.result.current.guard.save(first.call, onFirst, 'failed');
    });
    await act(() => view.result.current.guard.save(second, onSecond, 'failed'));
    expect(second).not.toHaveBeenCalled();
    expect(onSecond).not.toHaveBeenCalled();
    await act(async () => {
      first.finish(ok);
      await pending;
    });
    expect(onFirst).toHaveBeenCalledOnce();
  });

  it('holds the run still while a call is out, and frees it after', async () => {
    const { dispatch, view } = setup();
    const call = held();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = view.result.current.guard.save(call.call, () => {}, 'failed');
    });
    view.result.current.guard.move('no');
    expect(dispatch).not.toHaveBeenCalled();
    await act(async () => {
      call.finish(ok);
      await pending;
    });
    view.result.current.guard.move('no');
    expect(dispatch).toHaveBeenCalledWith('no');
  });

  it('toasts a failed save, skips the success path and can be tried again', async () => {
    const { view } = setup();
    const onDone = vi.fn();
    await act(() => view.result.current.guard.save(() => Promise.resolve(failed), onDone, 'Nope'));
    expect(onDone).not.toHaveBeenCalled();
    expect(view.result.current.toast?.message).toBe('Nope');
    await act(() => view.result.current.guard.save(() => Promise.resolve(ok), onDone, 'Nope'));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('leaves the run alone when an undo cannot delete', async () => {
    const { dispatch, view } = setup();
    const onDone = vi.fn();
    await act(() => view.result.current.guard.undo(() => Promise.resolve(failed), onDone));
    expect(onDone).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(view.result.current.toast?.message).toBe("Couldn't take that answer back.");
  });

  it('goes back after the undo has deleted', async () => {
    const { view } = setup();
    const onDone = vi.fn();
    await act(() => view.result.current.guard.undo(() => Promise.resolve(ok), onDone));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('frees the guard when a call throws', async () => {
    const { view } = setup();
    await act(async () => {
      await view.result.current.guard
        .save(
          () => Promise.reject(new Error('boom')),
          () => {},
          'failed',
        )
        .catch(() => {});
    });
    const onDone = vi.fn();
    await act(() => view.result.current.guard.save(() => Promise.resolve(ok), onDone, 'failed'));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('tracks the export flag', () => {
    const { view } = setup();
    expect(view.result.current.guard.exporting).toBe(false);
    act(() => view.result.current.guard.setExporting(true));
    expect(view.result.current.guard.exporting).toBe(true);
  });
});
