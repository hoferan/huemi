# 0012. Compose an outfit above a pairwise engine

Status: Accepted, 2026-09-22

## Context

The suggestions screen looked like assembly work. The block component and the session
reducer were already built and the engine already returned a ranked list per slot, so
putting five blocks on a screen should have taken a morning. What the engine returns is
why it did not.

### One score, five slots

`suggest(base, slot, baseSlot)` scores a candidate against the base and against nothing
else. The slot reaches that score through one path: `chromaLoad` inside `rate()` weights
the candidate's chroma by `SLOT_AREA[slot]`. That is one multiplier on one of four terms,
and it moves the ranking very little.

So the four non-base lists come back nearly identical. A Mustard top, `#c39a3a`, ranks
Grey first and Tan second in outerwear, bottom, shoes and accessory alike, and fills the
next three places with Khaki, Pale blue and Camel in a slightly different order each time.
Taking each slot's best gives four Grey blocks.

`rate()` is doing what it was asked to do. A pairwise score cannot tell one slot from
another except through the parameters it is handed, and area is the only one it has.
Choosing the five pieces as a set has to happen somewhere above the engine.

### The budget a pairwise score cannot enforce

ADR 0009 adopted Moon and Spencer's area observation as the cap on saturated colors.
`chromaLoad` sums each piece's chroma weighted by the area of its slot, and `TUNING`
carries the budget it should stay under. `rate()` applies that to two pieces, the base and
the candidate it is scoring, because two pieces are all a pairwise score can see.

Five pieces that are each inside the pairwise budget can be collectively far over it. Take
the rule the prototype uses, where every slot walks its ranked list and takes the first
color whose hex is not already on screen. Against a camera-read red top at `#a3231f` it
returns Charcoal, Brown, Olive and a Rust accessory, which together carry 1.57 times the
budget. A Mustard top comes out at 1.35 times.

That rule also puts two blocks reading "Rust" on the screen, the base and the accessory,
because `#a3231f` is not a palette entry and `#a4522d` is the palette color nearest it.
Distinct hexes are not distinct names, and the name is the only non-color channel a
color-vision-deficient user has (A11Y.md).

## Decision

The engine keeps its pairwise contract. `suggest()` and `rate()` are unchanged, and the
benchmark in `engine.benchmark.test.ts` still measures what ADR 0010 tuned.

The outfit is composed above it, by `composeOutfit` in `src/session/select.ts`, which
already owned the join between the session and the engine. It walks each slot's ranked
list in order and skips a candidate on either of two grounds: its `colorName` is already
on screen, or adding it would take `chromaLoad` over `TUNING.chromaBudget` across the
whole outfit rather than across a pair. The Mustard top falls from 1.35 times the budget
to 0.95.

## Consequences

A chromatic base in a large slot can be over the budget on its own, and then no choice of
the other four brings the outfit back under. The `#a3231f` top above spends 1.10 times the
budget before anything else is on screen. The composer does not pretend it can comply: it
takes the quietest color left rather than the highest-ranked one, and the outfit stays
over. Letting the budget veto a color the user is actually wearing was the alternative,
and that is not the app's decision to make.

The alternatives sheet is deliberately unfiltered. It shows a slot's full `suggest()`
list, including colors the composer would skip, because the block's position label counts
against that list: "2 of 18" has to mean the eighteen entries the sheet shows. Filtering
is how an outfit is seeded and shuffled; it does not decide which colors a user may
choose.

Shuffle is the same function with a random starting offset per unlocked slot and the
locked slots passed in as fixed ground, so both constraints hold across a shuffle without
a second implementation.

`composeOutfit` takes its randomness as a parameter. Only the base travels in the URL, so
a refresh of `/suggest` has to rebuild the outfit the user was looking at rather than a
different one, and seeding with `() => 0` is what makes that possible.
