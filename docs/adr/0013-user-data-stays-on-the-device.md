# 0013. Keep user data on the device

Status: Accepted, 2026-09-24

## Context

huemi now keeps three kinds of user data: the onboarding flag, saved outfits, and
a log of the times the user corrected a color the camera read. Each one describes
someone's wardrobe or how they use the app. The brief left open whether saved
items live only on the device, and issue #22 asked the same question for
corrections before any were recorded.

ADR 0001 already rules out a server for the product's own features. It says
nothing about where the data goes. The correction log is the first data
with a reason to leave: the handoff notes call it training data for the color
reader, and the reader is tuned in the harness on a developer's machine, not on
the user's phone.

Three options were weighed. Sending corrections to an endpoint after consent
would get real misses back to the harness, but it needs a backend, a consent
screen and a privacy notice, which is a product of its own. A user-triggered
export keeps the data local until the user acts, but it is a screen and a file
format for a consumer that does not exist yet. Keeping everything local costs
nothing now and leaves both open.

## Decision

Everything huemi stores stays in the browser's storage on the device, and the app
sends nothing over the network.

A photo or camera frame is never stored at all. It lives in the in-memory session
from capture to confirmation and is gone on reload. The correction log records the
slot, the hex the camera read, the hex the user chose and when, and keeps only the
most recent entries.

ESLint enforces this in `src/`: the network globals and `navigator.sendBeacon` are
restricted in `eslint.config.js`. That catches the ordinary ways of sending data,
and the rule's comment lists what still gets past it.

## Consequences

Nobody but the user can see their wardrobe, and no copy exists anywhere else that
would need securing.

The correction log has no consumer yet. It collects on the phone, and none of it
reaches the harness until an export exists. How the data would be used is still
undecided.

Clearing site data, or switching browser or phone, loses saved outfits, and
nothing in the app can bring them back. Milestone six's offline work does not
change that.

Anything that sends data off the device needs a new record that supersedes this
one, and the lint rule fails a stray `fetch` before it reaches review. The service
worker in milestone six needs `fetch` to serve the app offline. It sends no user
data, so an exemption to the rule covers it without a new record.
