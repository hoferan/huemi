# 0008. Write end-to-end tests as Gherkin feature files

Status: Accepted, 2026-09-16

## Context

The end-to-end suite covers the flows a person actually performs: arriving at the
app, choosing a garment slot, picking or photographing a color, swapping a
suggestion, keeping one while shuffling the rest, saving an outfit and coming back
to it.

Two things make those flows worth describing in prose rather than only in code. The
handoff notes already state them behaviorally, down to gesture thresholds and
timings, so a scenario is closer to the source material than an assertion is. And
decision 0007 sets a preference for enforcement over description: a document that
executes cannot go stale silently, which is the property that makes it worth
committing at all.

The alternative considered was plain Playwright specs with behavior-shaped titles.
That is cheaper and debugs more directly, and it was the recommendation before this
decision was taken. It was rejected in favor of scenarios that read as
specifications.

## Decision

End-to-end tests are written as Gherkin `.feature` files and run through
`playwright-bdd`, which generates Playwright tests from them and executes those with
the normal Playwright runner. Version 9.2.1 peers on `@playwright/test` 1.44 or
later, and the project is on 1.63.0.

Feature files and their step definitions are committed and reviewed like code.

The generation step runs before the tests, in the `e2e` script and in continuous
integration, and the generated output is excluded from version control.

## Consequences

A scenario is a specification that fails when the behavior drifts, which is the
strongest form of documentation this project has available. Anyone can read what the
app is supposed to do without reading TypeScript.

Scenarios stay close to the brief and the handoff notes, so an acceptance criterion
and a test can be the same sentence.

The costs are real and were accepted knowingly. There is a glue layer: a feature
file, a step definition, and a generation step between writing a test and running
it. A failure points at generated code rather than at the file that was authored,
which makes debugging less direct. Step definitions accumulate and need the same
care against duplication as any other code.

Not everything in this app is scenario shaped. Contrast ratios across the picker's
range, perceptual color naming, minimum target sizes, reduced motion, and focus
landing correctly after navigation are invariants rather than journeys, and
Given-When-Then adds nothing to them. `playwright-bdd` generates tests into a
Playwright project and does not prevent ordinary specs living alongside, so those
assertions stay as plain Playwright and unit tests. The rule of thumb is that a
scenario describes something a person does, and an invariant describes something
that must always be true.

Implementation surfaced a constraint this decision didn't anticipate:
`playwright-bdd`'s generated tests resolve their config at runtime by the
running project's `testDir`, and that has to be exactly the `outputDir` passed
to `defineBddConfig`, not merely a parent of it. A project's plain Playwright
specs have to live under that same `testDir` to be discovered at all, so the
generated feature specs and the hand-written invariant specs share `e2e/`
directly rather than the generated files sitting in their own subfolder. There
is no dedicated directory to gitignore as a result; the generated
`*.feature.spec.js` files are excluded by filename pattern instead, in
`.gitignore`, `.prettierignore`, and `eslint.config.js` (each carries a comment
pointing back here). The outcome the decision wanted — generated output never
committed, linted, or reformatted — still holds; only the mechanism differs
from what was assumed when this ADR was written.
