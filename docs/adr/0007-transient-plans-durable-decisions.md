# 0007. Keep working documents transient and decisions durable

Status: Accepted, 2026-09-16

## Context

Work on huemi runs through a process that generates documents: a design spec per
milestone, an implementation plan, task briefs, implementer reports, and a ledger of
decisions taken while executing. They are detailed and they are useful while the work
is in flight.

They are also wrong almost immediately. The milestone one plan carried five defects
that the review loop caught: a `tsconfig.node.json` that could not compile, a
`vite.config.ts` importing `defineConfig` from the wrong package, a staging step that
would have committed `node_modules` to a public repository, a missing `@types/node`,
and a type guard that let a non-canonical value into a branded type. Every one of
those was fixed in code while the plan still described the original.

Committing that plan would have left the repository asserting things about the build
that are false. Worse, it would invite a contributor to correct working code back
into a documented mistake. The reviewer raised exactly this risk when it required the
reason for a `tsconfig` deviation to live in a comment in the file rather than in a
report that never reaches git.

The opposite risk is real too. Decisions made during the work have to survive it, and
a ledger that gets deleted at the end of a milestone is a decision made in secret.

## Decision

Working documents stay out of the repository. `docs/superpowers/` is gitignored, so
specs, plans and briefs cannot be committed by accident, and the execution ledger
lives outside the tree entirely.

Decisions that must outlive their milestone go into one of these, in order of
preference:

1. A test, a lint rule, or a type, when the decision can be enforced
2. A comment in the file the decision constrains
3. `CLAUDE.md`, for conventions that govern how work is done
4. An architecture decision record, for decisions with no natural home in code

A decision recorded only in a plan is treated as not recorded.

Where something already enforces a decision, records point at the enforcement rather
than restating the rule.

## Consequences

The repository stays legible. A contributor reads the code, `CLAUDE.md`, the design
record and these decision records, and finds nothing describing a version of the
project that no longer exists.

Enforcement is preferred over description wherever it is possible, which is the part
that actually works. Three of milestone one's five plan defects were caught because
something enforced a rule rather than remembering it. A rule in a test fails when
broken; a rule in a document does not.

The cost falls on continuity. A session starting fresh cannot read the reasoning
behind a decision unless it reached one of the four homes above, so promoting a
decision has to happen while it is being made rather than at the end. This record and
the ones beside it are that promotion done deliberately.

Milestone specs and plans still get written. They are scaffolding for executing one
milestone, not documentation of the project.
