// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { loadWorker } from './fakeWorkerScope';

const PRECACHE = ['/', '/index.html', '/assets/a.js'];

async function installed() {
  const scope = loadWorker({ precache: PRECACHE });
  await scope.install();
  return scope;
}

describe('service worker', () => {
  it('precaches the build on install', async () => {
    const scope = await installed();
    expect(scope.cacheNames()).toEqual(['huemi-test']);
    expect(scope.cachedUrls('huemi-test')).toEqual(PRECACHE);
  });

  it('answers a precached url from the cache without the network', async () => {
    const scope = await installed();
    const response = await scope.fetchEvent('/assets/a.js');
    expect(response?.body).toBe('/assets/a.js');
    expect(scope.fetched).toEqual([]);
  });

  it('answers a navigation to any other path with the cached index.html', async () => {
    const scope = await installed();
    const response = await scope.fetchEvent({
      url: 'https://app.test/suggest?slot=top',
      mode: 'navigate',
    });
    expect(response?.body).toBe('/index.html');
    expect(scope.fetched).toEqual([]);
  });

  it('sends a missing asset to the network instead of the app shell', async () => {
    const scope = await installed();
    const response = await scope.fetchEvent('/assets/gone.js');
    expect(scope.fetched).toEqual(['/assets/gone.js']);
    expect(response?.body).toBe('network:/assets/gone.js');
  });

  it('leaves cross-origin and non-GET requests alone', async () => {
    const scope = await installed();
    expect(await scope.fetchEvent({ url: 'https://elsewhere.test/x' })).toBeNull();
    expect(await scope.fetchEvent({ url: 'https://app.test/', method: 'POST' })).toBeNull();
  });

  it("deletes older huemi caches on activate and leaves other sites' caches alone", async () => {
    const scope = await installed();
    scope.seedCache('huemi-old');
    scope.seedCache('other');
    await scope.activate();
    expect(scope.cacheNames().sort()).toEqual(['huemi-test', 'other']);
  });

  it('matches cached files whatever their Vary header says', async () => {
    // Vite's preview server sends `Vary: Origin`, and a page's module script and
    // stylesheet are CORS-mode requests that carry an Origin. Without ignoreVary
    // the entry stored at install misses them and the app never loads offline.
    const scope = await installed();
    await scope.fetchEvent('/assets/a.js');
    await scope.fetchEvent({ url: 'https://app.test/suggest', mode: 'navigate' });
    expect(scope.matchOptions).toHaveLength(3);
    expect(
      scope.matchOptions.every((options) => (options as { ignoreVary?: boolean }).ignoreVary),
    ).toBe(true);
  });

  it('never skips waiting or claims clients', async () => {
    const scope = await installed();
    await scope.activate();
    expect(scope.skipWaitingCalled).toBe(false);
    expect(scope.claimCalled).toBe(false);
  });
});
