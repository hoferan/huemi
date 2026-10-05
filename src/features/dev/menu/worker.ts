/**
 * The offline worker, as the dev menu sees it. A port so the menu's tests need
 * neither a service worker nor a Cache Storage, which jsdom has neither of.
 */
export interface WorkerPort {
  /** The caches `sw.js` made, by name. */
  cacheNames(): Promise<string[]>;
  /** Asks the browser to look for a new worker; `none` when nothing is registered. */
  update(): Promise<'checked' | 'none'>;
  /** Whether a registration was removed. */
  unregister(): Promise<boolean>;
  reload(): void;
}

/* v8 ignore start -- needs a real service worker; e2e/features/devmode.feature drives it. */
export const browserWorker: WorkerPort = {
  // The prefix `pwa/vite-plugin.ts` gives the cache, so a cache from anything
  // else on the origin is left out.
  cacheNames: async () => (await caches.keys()).filter((name) => name.startsWith('huemi-')),
  update: async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return 'none';
    await registration.update();
    return 'checked';
  },
  unregister: async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration ? registration.unregister() : false;
  },
  reload: () => {
    location.reload();
  },
};
/* v8 ignore stop */
