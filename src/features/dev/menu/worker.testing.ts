import type { UpdateResult, WorkerPort } from './worker';

/**
 * An in-memory worker. `update` says whether a check finds a new version, and
 * `reloaded` counts the page reloads it was asked for.
 */
export function fakeWorker(
  init: Partial<{ caches: string[]; registered: boolean; update: boolean }> = {},
): WorkerPort & { reloaded: number } {
  let registered = init.registered ?? false;
  const worker = {
    reloaded: 0,
    cacheNames: () => Promise.resolve(init.caches ?? []),
    update: () =>
      Promise.resolve<UpdateResult>(
        !registered ? 'unregistered' : init.update ? 'found' : 'none-found',
      ),
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
