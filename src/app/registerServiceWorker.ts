/**
 * Registers the offline worker. Production builds only: `dist/sw.js` exists
 * only after `vite build`, and a worker in development would serve stale files
 * to whoever is editing them.
 *
 * `navigator.serviceWorker` is missing on an insecure origin and in some
 * private windows, and registration can be refused. The app works without the
 * worker, so none of that is an error worth showing.
 */
export async function registerServiceWorker(
  enabled: boolean = import.meta.env.PROD,
  container: Pick<ServiceWorkerContainer, 'register'> | undefined = navigator.serviceWorker,
): Promise<void> {
  if (!enabled || !container) return;
  try {
    await container.register('/sw.js', { scope: '/' });
  } catch {
    // Offline support is an extra; carry on without it.
  }
}
