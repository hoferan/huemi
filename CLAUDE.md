# huemi

Color-blocking web application. Public repository, MIT licensed, hosted at
`github.com/hoferan/huemi`.

## Stack and commands

React 19 and TypeScript on Vite 8, built as a static single-page app. StyleX for
styling, Radix UI for unstyled primitives, lucide-react for icons. Vitest with
Testing Library for unit tests, Playwright for browser tests, Codecov for coverage.

|                         |                                         |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Dev server                              |
| `npm run build`         | Production build                        |
| `npm run preview`       | Serve the build                         |
| `npm test`              | Unit tests                              |
| `npm run test:coverage` | Unit tests with coverage                |
| `npm run typecheck`     | `tsc` over the app and the build config |
| `npm run lint`          | ESLint                                  |

**Every dependency is pinned exactly.** `.npmrc` sets `save-exact=true` and
`engine-strict=true`. Do not introduce range specifiers; Dependabot raises updates as
reviewable pull requests.

**TypeScript is pinned to 6.0.3 deliberately**, behind the current release.
`typescript-eslint` supports only below 6.1.0, and TypeScript 7 ships no importable
compiler API until 7.1, so upgrading it silently removes typed linting. See
[ADR 0001](docs/adr/0001-client-side-spa-on-vite.md).

**StyleX produces no CSS under Vitest.** Its plugin injects the stylesheet from a
build hook that Vitest never calls, so assert rendered color and computed style in
Playwright against a real build, never in a unit test. See
[ADR 0002](docs/adr/0002-stylex-over-tailwind.md).

Node is pinned in `.nvmrc`. With `engine-strict` on, any other version refuses to
install.

## Where to look

`docs/adr/` records the decisions that shaped the project and would otherwise be
reconstructed from guesswork.

`docs/design/` holds the original brief and the Claude Design prototypes the
interface came from, along with the known defects in them. The prototypes are a first
draft and the code supersedes them; where the two disagree, the code is right.

`A11Y.md` lists the accessibility invariants, separating what the code enforces today
from what later milestones still owe.

## Conventions

Whitespace and encoding come from `.editorconfig`: UTF-8, LF, two-space indent,
final newline, no trailing whitespace. `.gitattributes` keeps line endings as LF
whatever platform you are on.

`main` is protected by a ruleset. Branch, commit, open a pull request. Branch
prefixes are `feat/`, `fix/`, `chore/` and `docs/`; commit messages follow
Conventional Commits.

Squash is the only merge method, and the pull request body becomes the commit
message on `main`. Write the title as a Conventional Commit and keep the body
worth reading in `git log`. Squashing drops the co-author trailers from the
individual commits, so put them at the end of the pull request body instead.

## Skills

`.claude/skills/` holds a vendored copy of the superpowers skill library, so the same
working practices apply in a browser session on a phone as on the desktop app.

Invoke a relevant skill before responding, including before asking clarifying
questions. If a skill applies to the task, use it. Process skills come first and set
the approach: brainstorming before any creative or design work, systematic-debugging
before proposing a fix for any bug or unexpected behavior, test-driven-development
before writing implementation code, verification-before-completion before claiming
anything works.

Start with `using-superpowers`, which explains how the rest fit together.

These files are third-party and MIT licensed. See `.claude/skills/README.md` for
provenance and why they carry no hook.

## Working documents and decisions

Planning documents are transient. Specs, implementation plans, task briefs and
execution ledgers live under `docs/superpowers/`, which is gitignored, and they are
not part of the repository. They describe what was intended for one milestone, and
they diverge from the code as soon as review changes anything.

Decisions that outlive their milestone have to land somewhere durable. In order of
preference: a test, a lint rule or a type; a comment in the file the decision
constrains; this file, for conventions about how work is done; or an architecture
decision record in `docs/adr/`.

A decision recorded only in a plan is not recorded. Where something already enforces
a decision, point at the enforcement rather than restating the rule.

See [ADR 0007](docs/adr/0007-transient-plans-durable-decisions.md).

## Still outstanding

These were waiting on the stack choice and are now unblocked, but not yet done.

A `.github/workflows/ci.yml` running lint, typecheck, tests with coverage, the build
and the browser suite, with a `codecov.yml` gate. A `.github/dependabot.yml` for
version updates, grouped and prefixed so its pull requests satisfy the Conventional
Commit title check. CodeQL, through GitHub's default setup rather than a committed
workflow, with `docs/design/**` excluded. A `required_status_checks` rule on the
`main` ruleset, requiring one always-running gate job rather than the individual
jobs, because a required check that is skipped never reports and blocks the pull
request forever.
