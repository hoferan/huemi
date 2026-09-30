/* global self, caches, fetch, URL, CACHE, PRECACHE */
// The build prepends `const CACHE` and `const PRECACHE` (see vite-plugin.ts), so
// this file reads them as globals and cannot run on its own.

self.addEventListener('install', (event) => {
  // No skipWaiting: a new version waits until every window on the old one has
  // closed. Taking over mid-session would swap the code under someone who is in
  // the middle of building an outfit.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('huemi-') && name !== CACHE)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});

async function respond(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  // Any path the router serves is the same page, so a reload of /suggest offline
  // gets the shell and the router takes it from there.
  if (request.mode === 'navigate') {
    const shell = await caches.match('/index.html');
    if (shell) return shell;
  }
  // Everything else, a removed /assets file included, goes to the network so the
  // host's 404 still reaches the browser (ADR 0015).
  return fetch(request);
}
