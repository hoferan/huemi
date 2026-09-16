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

`main` is protected. Branch, commit, open a pull request. Branch prefixes are
`feat/`, `fix/`, `chore/` and `docs/`; commit messages follow Conventional
Commits.

## When the stack arrives

The build-output section of `.gitignore` is a stub holding `dist/`, `build/` and
`coverage/`. Extend it with whatever the toolchain produces, and record the build
and test commands here so later sessions can find them.
