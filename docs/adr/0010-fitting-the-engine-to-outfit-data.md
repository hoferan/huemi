# 0010. Fitting the engine against outfit data

Status: Accepted, 2026-09-18

## Context

[ADR 0009](0009-how-the-matching-engine-reasons.md) settled the shape of the matching
model from the literature and left one thing open, in its own words: the middle band of
coordination is "a shape without a scale", and nothing in the reading fixes where that
band sits for clothing. It said the corpus in #11 and the harness in #9 would settle it
by looking, as [ADR 0006](0006-color-engine-before-screens.md) had planned.

Looking was tried first. The harness grew a forced-choice pass asking which of two
candidates the rater would rather wear, which is how
[Gray and others](https://doi.org/10.1371/journal.pone.0102772) and
[Schloss and Palmer](https://doi.org/10.3758/s13414-010-0027-0) gathered the evidence
the model rests on, and forty answers came back. They carried no usable signal. Every
single-feature rule scored exactly 20 of 40 against a chance line of 20, the shipped
engine scored 22, and a thirteen-parameter refit reached 29 on the data it was fitted to
and 23 under leave-one-context-out. The session also had no repeated questions, so
rater noise and model error could not be told apart. One rater in one sitting is not
enough to fix a constant.

The Polyvore dataset was already cited in ADR 0009 as the closest thing to ground truth
available. The Maryland release at [xthan/polyvore-dataset](https://github.com/xthan/polyvore-dataset)
is Apache-2.0 and ungated, unlike the Hugging Face copy, which restricts access to
academic and non-profit use.

## Decision

The engine is measured against Polyvore, and the lightness term is refitted to it.

Garment colours are read from item names rather than images. Polyvore's own images are
dead, the mirror is an unofficial upload, and 31.3% of items name a colour in their
title, which leaves 10,683 usable outfits. That avoids background removal and colour
extraction error at the cost of coarse colour.

`rise` is gone. It rewarded lightness separation monotonically, and the measurement says
that is backwards. Real outfits are more coordinated than random pairs, not less: 22.0%
of real garment pairs share a colour against 9.0% of random ones, mean lightness contrast
is 0.248 against 0.304, and mean hue contrast is 65 degrees against 88. As lift over
random pairs across the lightness range, real outfits run

| lightness gap | 0.0-0.1 | 0.1-0.2 | 0.2-0.3 | 0.3-0.4 | 0.4-0.5 | 0.5-0.6 | 0.6-0.7 | 0.7-0.8 |
| ------------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
| lift          | 1.63    | 0.90    | 0.81    | 0.83    | 1.03    | 0.68    | 0.66    | 0.71    |

One peak, and a range above it that is close enough to flat that a second peak would be
reading shape into noise. The 1.03 bin is parity. So the term is a single band centred
at 0.05 with a spread of 0.14, and nothing else.

Only those two constants come from the data. Fitting all thirteen against the same
training set moved compatibility AUC from 0.578 to 0.580 and the blank-filling benchmark
not at all, so the rest stay as ADR 0009's first cut rather than becoming numbers a
reader has to take on trust.

`suggest` demotes near-duplicates of the base below everything else, at an OKLab distance
of 0.06. This is a statement about what a suggestion is for and not about colour, which
is why it lives in `suggest` and not in `rate`.

## What was refused

**Fitting to maximise discrimination.** A full fit reaches 0.580 AUC by driving the
lightness centre to zero, and then recommends Navy, Black and Charcoal for a navy bottom.
It wins by predicting what stylists post, and the most typical outfit is tonal.
Discrimination measures typicality; Gray and others measured what people rate as
fashionable and found a moderate optimum. Optimising posting behaviour would make huemi
confidently boring.

**Moving the peak off zero to avoid that.** Tried, at 0.12, and it was worse than what it
replaced: 31.9% on held-out substitution against the shipped 42.2%, because 22% of real
pairs sit at exactly zero and the change put the scoring floor under the largest cluster
in the data. The monochrome problem is a product constraint and is now expressed as one.

**Treating the 65 degree mean hue contrast as confirming `targetHue`.** It was recorded
as confirmation at first and it is not. The mean of a distribution that may be bimodal
says little about where its peak is, which is the same mistake this ADR corrects for
lightness. `targetHue` remains unvalidated.

## Consequences

Measured on the benchmarks, against the shipped ramp:

|                        | shipped ramp | this  |
| ---------------------- | ------------ | ----- |
| substitution, held out | 42.2%        | 56.9% |
| compatibility AUC      | 0.398        | 0.578 |
| fill in the blank      | 40.6%        | 57.8% |

The chance line for the blank-filling subset is 47.5%, because coverage leaves a varying
number of scoreable options per question. The engine was below chance on every measure
and is now above it on all three.

[Zhang and others](https://arxiv.org/abs/2007.02388) reach 0.84 AUC on the compatibility
benchmark with a model trained on three K-means dominant colours per garment. Thirteen
constants read off a colour word are not going to match that, and the gap is the price of
a model a person can read.

`src/color/engine.benchmark.test.ts` holds the measurement. It skips when `tmp/polyvore/`
is absent, so CI never runs it, and it exists so that the next change to `TUNING` can be
checked the same way rather than argued about.

Four tests in `engine.test.ts` asserted the old direction and were rewritten. One of them
compared ranks where it should have compared scores: Mustard sits near the bottom of both
lists it was measured across, so the assertion read equal whatever the area weighting did.

This supersedes ADR 0006 on where the corpus comes from. The harness is still the
instrument for judgement and the forced-choice pass still works, but a regression corpus
authored by one person in one sitting is not what fixes a constant. Preference data at
scale would; #11 stays open for it, and collecting it from users during normal use is
worth considering as a feature rather than a chore.

The colour reading is the weakest link. It is coarse, it covers 31% of items, and
collapsing every "black" to one hex overstates how often real outfits are exactly tonal.
Polyvore is also stylist-curated, luxury-skewed and from 2017, so it records what
stylists posted rather than what anyone wears.
