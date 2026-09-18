# 0011. Route with React Router, and move focus from the screen

Status: Accepted, 2026-09-18

## Context

Milestone one left `main.tsx` and `App.tsx` at the source root with no router,
because there was nothing to route between. Milestone three adds six screens.

The prototype swaps screen branches inside one component. On navigation, focus
stays wherever it was, usually on a control that no longer exists, and a screen
reader announces nothing at all. Whatever routes the app has to repair that.

Two alternatives were weighed. A `screen` field on the session reducer needs no
dependency and gives one source of truth, but hardware back would leave the app
on Android, the accessibility checks would have no route list to run over, and
the progressive web app in milestone six would have to retrofit real URLs.
Encoding the whole session in the URL survives a refresh, but locks, cursors and
a toast in search parameters is a format that would then need versioning.

Between a library and a hand-rolled router over `pushState`, the deciding factor
was `<Link>` rendering a real `<a href>`. Keyboard behaviour, middle-click and
the link role come with it, where a hand-rolled router drifts towards buttons
styled as links. Focus management is ours to write either way.

## Decision

React Router 8.4.0 in declarative mode, one route per screen, and the base
colour and slot in `/suggest`'s search parameters so the core screen survives a
refresh. Nothing else goes in the URL.

Focus moves from the receiving end. `src/ui/Screen.tsx` takes focus to its own
`<h1>` after a client-side navigation, and every screen renders one. Issue #12
asked for a navigate helper that all navigation routes through. A sending-end
helper is bypassed by any plain `<Link>`, which is the thing the router was
chosen for, and a screen that does not render `Screen` has no heading and no
`main` landmark either, so the accessibility checks catch it.

Focusing the heading is the announcement, because a screen reader reads the
element it lands on. The shell's polite live region is therefore for changes
with no focus move, which in this milestone means the toast.

## Consequences

`public/_redirects` carries the single-page fallback. A client-side router
serves every path from one HTML file, so a deployed reload of `/suggest` would
otherwise be a 404 from the host.

Screens are unit-testable under `MemoryRouter` without a browser.

The focus move does not fire on the first load, where focus belongs at the
document start. React Router marks that entry with the location key `default`,
which is what `Screen` tests against. A router upgrade that renames it would
make the app steal focus on arrival, and `src/ui/Screen.test.tsx` covers that
case.

A deep link to `/suggest` with no valid base parameter cannot rebuild the
session, so it redirects to the entry screen. That arrives in #17 with the
screen itself.
