# 0014. Check an outfit by describing it, never by judging it

Status: Accepted, 2026-09-25

## Context

The brief asked for an outfit rating: "a photo with a score and some explanation of
that score". It also left open whether a rating is one number or a set of observations,
and the handoff notes pushed away from the number: avoid "rate", "score" and "fix", and
treat the sentence as the result and the number as a tag.

ADR 0006 expected the rating logic to read the matching engine backwards, judging a
combination instead of proposing one. The engine's total is a weighted sum of four terms,
and ADR 0009 left its scale open on purpose: the middle band of coordination has a shape
and no scale. A score out of ten would claim a precision that sum does not have. The
PO chose observations over a number from three mocks on 2026-09-25.

The first design kept one judgement. Each term would say "look here" when it went past a
line, the result would count those, and the swap button would point at the piece to
blame. The lines were to be measured against Polyvore's compatibility set, the
human-labelled compatible and incompatible outfits that ADR 0010 already uses.

### The composer's budget was never the line

`TUNING.chromaBudget` is where the composer stops adding color to a suggestion (ADR
0012). It is too strict to judge an outfit someone already wears. A camel coat, cream
top, olive trousers and brown shoes carry 1.37 times the budget. The prototype's own
example, a charcoal jacket over a cream top with rust trousers and burgundy shoes, is
1.16 times over, and the rust trousers carry 0.096 of its 0.139. Its sentence blamed the
shoes, which at a slot area of 0.15 carry almost nothing.

### What Polyvore says

Of the 3,076 outfits in the compatibility set, 649 have at least two checked pieces with
a color word the benchmark can read: 332 compatible and 317 incompatible. Flag rates at
a sample of lines, compatible then incompatible:

| Line                                                | Compatible | Incompatible |
| --------------------------------------------------- | ---------- | ------------ |
| Area-weighted chroma over 0.09                      | 45.5%      | 36.6%        |
| Over 0.12, the composer's budget                    | 29.5%      | 23.7%        |
| Over 0.15                                           | 19.9%      | 14.2%        |
| Over 0.19                                           | 9.9%       | 5.0%         |
| Over 0.25                                           | 2.7%       | 0.3%         |
| Warm and cool strength over 0.50                    | 15.7%      | 12.9%        |
| Over 0.70                                           | 10.5%      | 10.1%        |
| Has a warm and a cool piece at all                  | 22.0%      | 17.0%        |
| Weakest piece by `rate()`, lowest 10% of compatible | 10.0%      | 5.7%         |

Every line points the same way. The outfits people said work carry more color and mix
warm and cool more often than the ones they said do not. The full engine score does no
better at the tail: the piece that scores worst against the rest of its outfit scores
worse in compatible outfits. A flag built on anything the engine measures would point
at good outfits more often than bad ones.

The evidence is weak. Most of the set drops out for lack of two readable pieces, the
colors come from words like "rust" rather than from pixels, and curated outfits may lean
on a statement color where the incompatible sets are random items, mostly black and
white. All of it still points against flagging, and there is nothing else to measure
against.

## Decision

The check describes and never judges. The PO chose this on 2026-09-25 over flagging on
the engine's model regardless of the data, and over pausing for better data.

`checkOutfit` in `src/color/check.ts` returns up to three observations, each naming the
pieces it is about with their colors:

- How much color there is and which piece carries most of it. An outfit of neutrals is
  called that. Otherwise the composer's budget divides quiet from colorful, as a
  description of how much color there is.
- Whether the colored pieces sit warm, cool or both, by `temperature()` alone. The engine
  damps a faint color's temperature before it penalizes a warm and cool pair. A
  description has nothing to penalize, so Cream counts as warm.
- Whether the pieces are close in lightness or far apart, split at the fitted lightness
  curve's width, `tonalLightness + spreadLightness`.

Hue is left out. It has the smallest weight in `rate()`, depends on which piece is figure
and which ground, and does not reduce to a plain sentence.

Nothing is counted, flagged or scored. The title is always "How it works together". With
fewer than two pieces `checkOutfit` returns null, so a refreshed result whose session
lost the outfit cannot describe one that is not there. The sentences live in
`src/features/check/copy.ts`.

## Consequences

The result screen (#25) has no piece to blame, so every block is a swap target and there
is no single "swap the weakest" button. It shows the pieces as full-width blocks with no
photo, which the PO also chose on 2026-09-25: the blocks carry the corrected colors, and
hand-entered checks have no photo anyway.

A benchmark test, `finds no sign that color or warm against cool marks a bad outfit`,
asserts the direction above. If a better reading of color ever reverses it, the test
fails, and flagging is worth reconsidering against the new data.

The brief's limit on saturated colors survives as a rule for composing suggestions. It is
not applied to what someone is already wearing.
