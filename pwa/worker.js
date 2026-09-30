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

// ignoreVary: the files are static, and a host that sends `Vary: Origin` would
// otherwise make every CORS-mode request for a script or stylesheet miss the
// entry stored at install, which has no Origin. Offline, that is a blank page.
const MATCH = { ignoreVary: true };

async function respond(request) {
  const cached = await caches.match(request, MATCH);
  if (cached) return cached;
  // Any path the router serves is the same page, so a reload of /suggest offline
  // gets the shell and the router takes it from there. The shell is the root,
  // not /index.html: a host that redirects /index.html to / would have left a
  // redirected response in the cache, and a navigation cannot be given one.
  if (request.mode === 'navigate') {
    const shell = await caches.match('/', MATCH);
    if (shell) return shell;
  }
  // Everything else, a removed /assets file included, goes to the network so the
  // host's 404 still reaches the browser (ADR 0015).
  return fetch(request);
}
