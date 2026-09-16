# huemi

Color-blocking web application. Public repository, MIT licensed, hosted at
`github.com/hoferan/huemi`.

## Where the project stands

No stack has been chosen, so the repository has no dependencies and no build. If
you are reaching for a build or test command, it does not exist yet. Ask instead
of guessing at one.

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

## When the stack arrives

The build-output section of `.gitignore` is a stub holding `dist/`, `build/` and
`coverage/`. Extend it with whatever the toolchain produces, and record the build
and test commands here so later sessions can find them.

Dependabot security updates are on but do nothing until a lockfile exists. A
`.github/dependabot.yml` for version updates, CodeQL scanning, and a
`required_status_checks` rule on the ruleset all wait on the stack choice.
