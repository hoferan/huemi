# 0022. Offer a waiting update on the start screen

Status: Accepted, 2026-10-16. Amends
[ADR 0016](0016-precache-the-build-with-a-hand-written-service-worker.md).

## Context

ADR 0016 has a new version wait until every window on the old one has closed, so the
app updates on its next fresh launch, with no prompt. On a desktop browser that comes
soon enough. An app installed on a phone is rarely closed: iOS and Android suspend it
in the background and bring it back where it was, with no page load. The browser checks
for a new `sw.js` only on a load, so a suspended app neither finds a new version nor
gets to switch to one. Someone who never swipes huemi away in the app switcher can stay
on an old build for weeks.

ADR 0016's reason for not swapping versions still holds. A reload in the middle of an
outfit loses it, because the session lives in memory.

## Decision

The start screen shows a quiet "Update huemi" button, styled like Install, while a new
version waits. Tapping it switches to that version and reloads. It shows on no other
screen. The start screen has nothing in progress, and saved outfits are in storage, so a
reload there loses nothing. The product owner chose this from mocks over a bar above the
cards and over a silent reload when the app comes back to the foreground.

The worker still never calls `skipWaiting` by itself. It calls it when a page sends
`{ type: 'skip-waiting' }`, and only the button sends that. The window that sent it
reloads once the new worker controls it. Another huemi window open at the same time is
not reloaded.

`src/features/update/useUpdateReady.ts` watches the registration. It offers a worker
that was already waiting when the page loaded, and one that finishes installing while an
older one is active. A first install has nothing older and offers nothing. When the app
comes back to the foreground an hour or more after the last check, it asks the browser
to check again, so a suspended app finds new versions too. Waiting an hour keeps a quick
switch between apps from fetching `sw.js` each time. A check that fails offline is dropped,
and the next one tries again.

Closing the app fully still updates it silently, as before.

## Consequences

Someone who keeps huemi suspended finds a new version the first time they bring it back
more than an hour after the last check, and sees the button on the start screen from
then on. Nobody is pulled out of an outfit to update.

The unit tests drive the watcher against a fake registration. The browser suite has no
test that deploys a second build, since faking one costs more than it proves. A preview
deploy followed by a second one is the first real check of the whole path.
