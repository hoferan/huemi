# 0016. Precache the build with a hand-written service worker

Status: Accepted, 2026-09-30

## Context

huemi is used at a wardrobe or in a changing room, where signal is often poor, so opening
without a connection is a requirement and not a nicety. The app makes no requests of its
own: everything runs on the device (ADR 0001) and everything it stores stays there (ADR
0013). What has to work offline is the build itself, the HTML, the scripts, the styles, the
font and the icons.

Two ways to get there were weighed. `vite-plugin-pwa` writes the worker and the manifest
for you, on top of Workbox. It supports Vite 8, but it brings `workbox-build` and
`workbox-window` as peer dependencies and about thirty packages behind them, among them
Babel, Rollup, terser and ajv. Every one is pinned exactly here and raises its own
Dependabot pull requests, and the job needed is small enough that most of Workbox would go
unused: cache the build, hand it back.

## Decision

A worker of about forty lines, `pwa/worker.js`, and a Vite plugin, `pwa/vite-plugin.ts`,
that writes it to `dist/sw.js` at the end of a build. The plugin puts the list of built
files and a cache name in front of the worker. The name is a hash of every file's path and
bytes, so a manifest or icon that changes under the same name still gives installed copies
a new cache. No dependency is added.

The worker precaches the build on install and answers from that cache. A navigation to any
path it does not hold gets the cached `index.html`, so a reload of `/saved` works offline.
Nothing is cached at run time, and a request for a file that does not exist goes to the
network, so the host's 404 for a removed `/assets/` file still reaches the browser (ADR
0015).

It matches the cache with `ignoreVary`. Vite's preview server sends `Vary: Origin`, and the
module script and stylesheet the built page loads are CORS-mode requests that carry an
`Origin`. The entries stored at install carry none, so without the option they missed and
the page came up blank offline. The files are static, so a header that says the response
varies is wrong for them. Only a real browser found this; the worker's unit tests cannot
send a `Vary`.

A new version does not take over a running app. The worker never calls `skipWaiting`, so it
waits until every window on the old version has closed, and the app updates on its next
fresh launch, silently. A reload in the middle of building an outfit would lose it, and
nobody wanted an update prompt. The old caches go when the new worker activates.

The worker is registered in production builds only, after `load`. A development server has
no `sw.js`, and one would serve stale files to whoever is editing them. A failed
registration is ignored, because the app works without the worker.

`/sw.js` is served with `Cache-Control: public, max-age=0, must-revalidate`, so an
installed app finds out about a new version. `netlify.config.test.ts` guards that rule.

The entry screen offers an Install button where the browser fires `beforeinstallprompt`.

## Consequences

Someone who has visited once can open the app, reload any screen and use it with no signal.
A first visit with no signal still needs the network, which nothing here can change.

Safari on iPhone fires no install event, so the button never shows there. Installing works
through Share and Add to Home Screen, which the app does not explain. The PO chose that on
2026-09-30 over a how-to sheet that would need to stay accurate as Safari changes.

An update reaches a person a launch late. That is the price of never replacing code under a
session.

Runtime caching, background sync or push would each be a reason to reopen this and move to
Workbox. The registration, the install button and the manifest would stay; the plugin and
the worker are what would be replaced.

The manifest and the icons are static files in `public/`. `scripts/make-icons.mjs` draws the
icon and renders its PNGs, and the results are committed so a build needs no image tooling.
