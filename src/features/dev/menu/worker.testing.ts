import type { WorkerPort } from './worker';

/** An in-memory worker. `reloaded` counts the page reloads it was asked for. */
export function fakeWorker(
  init: Partial<{ caches: string[]; registered: boolean }> = {},
): WorkerPort & { reloaded: number } {
  let registered = init.registered ?? false;
  const worker = {
    reloaded: 0,
    cacheNames: () => Promise.resolve(init.caches ?? []),
    update: () => Promise.resolve<'checked' | 'none'>(registered ? 'checked' : 'none'),
    unregister: () => {
      const was = registered;
      registered = false;
      return Promise.resolve(was);
    },
    reload: () => {
      worker.reloaded += 1;
    },
  };
  return worker;
}
