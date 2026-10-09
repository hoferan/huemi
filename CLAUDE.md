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

`.claude/launch.json` is tracked, against the global ignore Claude Code suggests for
that path. It sets `autoPort`, so the desktop app gives the dev server a free port,
and `vite.config.ts` reads that port from `PORT`. Neither half works alone.

## Where to look

`docs/adr/` records the decisions that shaped the project and would otherwise be
reconstructed from guesswork.

`docs/design/` holds the original brief and the Claude Design prototypes the
interface came from, along with the known defects in them. The prototypes are a first
draft and the code supersedes them; where the two disagree, the code is right.

`A11Y.md` lists the accessibility invariants, separating what the code enforces today
from what later milestones still owe.

`src/color/engine.benchmark.test.ts` measures the matching engine against the Polyvore
outfit dataset and is how its constants were settled (ADR 0010). The dataset is not ours
to redistribute, so it lives in the gitignored `tmp/polyvore/` and the tests skip without
it; CI never runs them. The file's own comment says which files to fetch and from where.
Run it before and after changing `TUNING`. `src/color/read.benchmark.test.ts` does the
same for the color reader, against exports from the field recorder in the gitignored
`tmp/field/`, and is the one to run around a change to `READ_TUNING`.

`src/dev/` is the color engine's harness, served at `/harness.html` while the dev
server runs. It renders candidate combinations as large blocks with their measured
numbers, so the regression corpus is authored by looking at colors rather than at a
table of hex values (ADR 0006). It is a development instrument: Vite builds only
`index.html`, so nothing under `src/dev/` reaches the bundle, and it is excluded from
coverage because what it is for is judgement no assertion replaces.

`src/features/dev/` is the developer mode, and unlike the harness it ships. Seven taps
on the start screen's wordmark and a passphrase turn on a DEV chip and a menu at
`/dev`, on the phone and offline (ADR 0019). Its code reaches a screen only through a
`DevSlot` the screen places, typed by `DevSlots` in `src/ui/devSlots.ts`. A new
developer feature adds a slot there and lists its component in
`src/features/dev/registry.tsx`. The field recorder at `/dev/field` records camera
frames of real garments with their true colors, for measuring the color reader in real
light. It keeps them on the device until someone deletes them there, and exports them
as one file (ADR 0020). Over the confirm screen's photo, a reader panel shows what
the color reader saw: the circle it sampled, each cluster's share, and the threshold
behind the verdict. Its readout and drawing live in `src/features/dev/reader/`, which
the harness's Read mode also uses. Over the suggestions screen's blocks, an engine
panel shows each suggested piece's rank and its score split into terms, and what keeps
each color ranked above it out of the outfit. Its readout lives in
`src/features/dev/engine/`. Both panels open from the same chip, `DevOverlay`. The
passphrase's hash is `VITE_DEV_MODE_HASH`, set in Netlify's site settings and never
committed, and `npm run devmode:hash` prints it for a passphrase typed at its prompt.
ADR 0019 says how to set it in Netlify. Under `npm run dev` the taps turn the mode on
without asking.

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

## Automation

`.github/workflows/ci.yml` runs three jobs: `verify` (lint, format check,
typecheck, unit tests with coverage, build), `e2e` (the Playwright suite) and
`pr_title` (the Conventional Commit title check).

**`all-green` is the only required check, and should stay that way.** It depends
on the other three and tests each result for `success`, so a job that is skipped
instead of run fails it. GitHub counts a skipped required check as satisfied, so
naming `verify` and `e2e` in the ruleset directly would reopen that hole. Add a
new job to `needs`, never to the ruleset.

The ruleset also requires a branch to be current with `main`, so a pull request
whose base has moved needs updating and a rerun before it merges.

Netlify deploys `main` and previews every pull request through its GitHub
integration, configured in `netlify.toml`. No workflow deploys, and the Netlify
build is not part of `all-green`. `netlify.config.test.ts` pins the camera policy,
the asset cache rule and the single-page fallback, since a Netlify build cannot
run in CI; the preview deploy is the first real check of anything else in that
file. See [ADR 0015](docs/adr/0015-deploy-with-netlifys-git-integration.md).

The app works offline through a service worker that `pwa/vite-plugin.ts` writes to
`dist/sw.js` at the end of a build; it precaches the build and nothing else. It is
registered in production builds only, so `npm run dev` never serves a cached copy.
Test it against `npm run preview`, or the browser suite, which does. See
[ADR 0016](docs/adr/0016-precache-the-build-with-a-hand-written-service-worker.md).

CodeQL runs through GitHub's default setup, so its configuration lives in
repository settings rather than in a committed workflow. Default setup has no path
filter, so the prototypes under `docs/design/` are scanned along with the
application; a run reports 4 of the 5 HTML files in the repository. They raise
nothing today. Excluding them would mean owning a committed CodeQL workflow and
wiring it into `all-green`, worth doing only once they start reporting findings you
would have to dismiss.

Dependabot raises updates weekly. It ignores major bumps of `typescript` and
`@types/node`; `.github/dependabot.yml` records the condition for lifting each.
