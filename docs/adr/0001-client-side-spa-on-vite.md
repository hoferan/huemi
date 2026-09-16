# 0001. Build huemi as a client-side single-page app on Vite

Status: Accepted, 2026-09-16

## Context

huemi started as a set of HTML and CSS prototypes exported from Claude Design. The
export names no stack. Its own README says to rebuild the designs in whatever
technology suits the target codebase, so the choice was open.

What the product needs is narrow. One person holds a phone at a wardrobe or in a
changing room. Every capability in the brief runs on the device: picking a color,
reading a color from the camera, suggesting colors for the other garments, and
saving outfits. Nothing needs a server, and nothing is shared between users.

The prototype is one component of about six hundred lines using a React-like model
of state and re-render, so a component framework maps onto it closely.

## Decision

React 19 and TypeScript on Vite 8, built as a static single-page app. Vitest with
Testing Library for unit tests, Playwright for browser tests. npm, with Node pinned
in `.nvmrc`.

No server, no framework with a server runtime. Deployment is a static build.

Every dependency is pinned exactly. `.npmrc` carries `save-exact=true` and
`engine-strict=true`, so nothing moves without a reviewable change and Dependabot
raises updates as pull requests.

## Consequences

The port from the prototypes is close to mechanical, since the prototype's state
model and React's agree.

Offline works without special effort, which matters because the app is used where
signal is poor. The progressive web app work in milestone six is additive rather
than a rewrite.

A static build deploys anywhere and costs nothing to run.

If suggestions ever move server-side, that is a real change rather than a
configuration switch, and it brings a no-network empty state the prototypes never
designed.

TypeScript is pinned to 6.0.3 rather than the current 7.x. `typescript-eslint`
supports only below 6.1.0, and TypeScript 7 ships no importable compiler API until
7.1, so adopting it today would mean giving up typed linting. This is time-bound
and should be revisited when 7.1 lands.
