# 0019. A developer mode inside the shipped app

Status: Accepted, 2026-10-05. Leaves ADR 0013 in force.

## Context

Milestone nine is about trusting the camera. The reader has been checked against
eight photos of real garments, none of them taken in dim light or of a busy scene,
so the shares it decides with are unmeasured where the app is actually used
(`READ_TUNING` in `src/color/read.ts`). Measuring them takes frames shot on the
phone, in a wardrobe, under a lamp or in a shop, each with a known answer.

The tools huemi has for this run on the PC. The harness under `src/dev/` is served
by the dev server only, and Vite never builds it. On a phone there is no way to
inspect or reset the app's own state short of clearing site data by hand.

A backend that collects readings from the field was considered and deferred (#64,
#100). huemi has no users besides its developer yet, so a server, a consent screen
and a privacy notice would serve one person, who can carry a phone to a PC instead.

#116 asks for a place on the phone where the developer's tools can live, offline
and in the installed app. The field recorder and the reader overlay planned for
later in this milestone need that place, and so will later developer features
(#113, #115).

## Decision

The developer's tools ship in the production build, hidden behind a developer mode.
The code lives in `src/features/dev/` and is tested and covered like any other
feature. `src/dev/` stays the unbundled harness.

Seven taps on the start screen's wordmark within three seconds open a sheet that
asks for a passphrase. The build compares a SHA-256 of `huemi-dev:` and the
passphrase with `VITE_DEV_MODE_HASH`. That value is set in Netlify's site settings
and never committed; `npm run devmode:hash` prints it for a passphrase read from
stdin. The dev server skips the sheet and turns the mode on straight away, and a
production build with no hash ignores the taps. `unlockMethod` in
`src/features/dev/passphrase.ts` decides between these cases.

The mode is one localStorage key, `huemi.devmode`, which is `on` or absent and sits
behind the `DevModeStore` port. It stays on in that browser until someone locks it
from the developer menu.

Developer code reaches a screen only through a slot. A screen places
`<DevSlot name="…" context={…} />` where a feature may draw, and `DevSlots` in
`src/ui/devSlots.ts` maps each slot name to the type of its context, so a slot and
whatever fills it agree at compile time. `DevSlot` lives in `ui`, which the import
zones in `eslint.config.js` keep from importing `features`. It reads a renderer
from `DevSlotContext` and draws nothing while that is null, as it is with the mode
off. `DevSlotHost` in `features/dev`, which `Root` mounts inside `DevModeProvider`,
supplies the renderer while the mode is on, and the renderer lazily imports
`registry.tsx`, the list of components for each slot. Apart from the start screen,
which hosts the unlock gesture, no screen branches on the mode beyond placing a
`DevSlot`. The first slot is `screen.badge`, for the grey DEV chip that links to
the menu.

`/dev` is a lazy route. With the mode off it renders the not-found screen, so the
address gives nothing away. With the mode on it shows the commit and build date,
resets for onboarding and saved outfits, the service worker's cache names with
Check for update and Unregister and reload, and a button to lock the mode.

A shared image, sentence or link never carries developer state. The share code
does not read the mode, and the scenario "Developer mode leaves a share unchanged"
in `e2e/features/share.feature` checks that a share made with the mode on is
identical to one made with it off.

## Consequences

The passphrase keeps casual visitors out and nobody else. The repository is
public, the hash ships in the JavaScript bundle where anyone can run a dictionary
against it, and the flag is a key anyone can set from the browser's console. That
is acceptable because a stranger who gets in can act only on their own device:
reset their own onboarding, clear their own saved outfits, unregister their own
service worker. huemi holds nothing of anyone else's for them to reach (ADR 0013).
A developer feature that ever touches shared data would need real authentication
and a record of its own.

ADR 0013 stands. The flag is the only new thing stored, it stays in the browser,
and nothing in the mode sends anything over the network.

A visitor who never unlocks the mode runs only the provider, the tap counter and
the unlock sheet, which are in the main bundle. The menu and every slot filler are
separate chunks, fetched when the mode turns on. The service worker precaches every
file in the build, so an installed copy holds those chunks as well and the mode
works offline, but nothing loads them while the mode is off.

A later developer feature adds a slot name and its context type to `DevSlots`,
places a `DevSlot` on the screen, and lists its component in `registry.tsx`. The
field recorder (`confirm.actions`) and the reader overlay (`confirm.overlay`) are
the next two.

Testing the passphrase needs a known hash. `e2e/devMode.ts` holds the one the
browser suite types, and `playwright.config.ts` and the e2e job in
`.github/workflows/ci.yml` repeat it, since neither can import that file. The
verify job builds with no hash, so it checks a build in which the mode cannot be
unlocked.

The seven-tap gesture is pointer-only and gives no hint that it exists. `A11Y.md`
records that as a deliberate exception, since the gesture is meant for the
developer alone.
