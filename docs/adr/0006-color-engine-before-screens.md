# 0006. Build the color engine before any screen

Status: Accepted, 2026-09-16

## Context

The brief is explicit that the color logic is the part that makes or breaks the
product, and equally explicit that nothing about it has been decided. It also rules
out the obvious starting point: clothing matching does not follow classical color
wheel harmony, and complementary and triadic schemes produce combinations people will
not wear. What the real rules lean on is neutrals, value contrast, warm and cool
grouping, and a limit on how many saturated colors appear at once.

The prototype's matching function is placeholder by its own comment. It filters the
palette on luminance difference and temperature, sorts by a hand-tuned score, and
staggers the starting position per slot so adjacent blocks differ.

The suggestions screen is shaped by what the engine returns: how many alternatives
exist per slot, whether they are ranked, whether a combination can be explained. A
screen built against a placeholder bakes the placeholder's shape into the interface,
and the interface then constrains the engine that replaces it.

## Decision

The engine is milestone two. No screen is built before it.

Milestone two opens with a research and prior-art review rather than going straight to
code, producing a written summary that feeds its own specification. The leads worth
checking are perceptual difference metrics, empirical work on color pair preference
rather than geometric harmony, value and chroma systems built for pigment rather than
light, outfit compatibility datasets, and how much of seasonal color analysis is
evidence rather than industry convention.

The brief's rejection of classical harmony is treated as a finding to test, not an
axiom.

Milestone two also builds a throwaway development-only harness that renders the
engine's output as the large blocks the real app uses, and the regression corpus is
authored through it.

## Consequences

Milestone three consumes a real contract rather than a guess. The `Suggestion` type is
defined in milestone one for that reason, even though nothing implements it yet.

The harness is the part most likely to be cut for time and should not be. Whether a
combination is wearable is a visual judgement, and a corpus authored from a table of
hex values would produce a passing test suite that nobody has ever looked at. The
harness is the instrument that makes the corpus mean something.

The visible cost is that there is nothing to demonstrate until milestone three. A
screen-first order would have produced something to show sooner, at the price of
building it twice.

Milestone five's rating logic is the same model read in the other direction, judging a
combination rather than proposing one, so it draws on this research instead of
repeating it.
