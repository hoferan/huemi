# 0005. Store outfit pieces as hexes, never as suggestion indices

Status: Accepted, 2026-09-16

## Context

A saved outfit records a base garment color and the colors chosen for the other
slots. The prototype stores the other slots as indices into the list that its
suggestion function returned, and it re-runs that function at render time to turn an
index back into a color.

That is unstable in two separate ways. Across versions, any change to the matching
rules reorders the list, so every stored index silently points at a different color
and every saved outfit changes without the user touching it. Within a single run it
is already unstable: when two slots would resolve to the same color the prototype
searches for a different index, so the same stored outfit can render differently
depending on what else is on screen.

The matching engine is the least settled part of this product and will change
repeatedly. Indices bind saved user data to an implementation detail that is
guaranteed to move.

## Decision

`Outfit.pieces` stores hex values, typed `Partial<Record<Slot, Hex>>`.

`Partial` rather than a total record, because partial outfits already exist in the
design. The accessory slot can be switched off, and the rating flow works from two
filled slots upward. TypeScript's `Record` is total, so the obvious spelling would
have been a lie the compiler enforced.

`pieces[baseSlot]` is populated, and the type carries a comment saying so, because an
undocumented hole in a map is a reliable source of bugs.

`Outfit` carries `version: 1`. Saved outfits go to local storage while the slot list
is still an open question, and without a version the first change to that list makes
every stored outfit unreadable.

`Hex` is a branded type whose only constructor is `parseHex`. Hexes arrive from three
untrusted sources: a camera reading, local storage, and the free picker.

## Consequences

A saved outfit means the same thing after the engine changes, which is the whole
point.

Hex string equality becomes load-bearing, since the pieces map and the per-slot locks
both compare by hex. That made an early defect matter: `isHex` originally reused a
case-insensitive pattern, so it could narrow an uppercase string to `Hex` without the
lowercasing `parseHex` performs, producing two values for the same color that were
not string-equal. `isHex` now narrows only canonical values, and both directions of
that contract are locked in by tests.

Storage is slightly larger, which is irrelevant at this scale.

Migration is a real obligation the moment the slot list changes, rather than a silent
corruption. That is the trade this decision buys.
