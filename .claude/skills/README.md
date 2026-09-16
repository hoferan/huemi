# Vendored skills

These are not huemi's own work. They are a copy of the **superpowers** skill library
by Jesse Vincent, MIT licensed, taken at version **6.3.0**.

Upstream: https://github.com/obra/superpowers
License: see `LICENSE` in this directory, which is the upstream copyright notice and
must travel with these files.

## Why they are here

Sessions on the desktop app get these skills from an installed plugin. Sessions on
claude.ai, including on a phone, get whatever the repository provides. Copying them
here means the same working practices apply wherever the work happens, rather than
depending on which device is at hand.

## Why there is no hook

The upstream plugin bootstraps itself with a `SessionStart` hook that runs a Windows
batch file and resolves a plugin root that only exists when the plugin is installed.
Neither holds in a browser session, so the hook was not copied.

`CLAUDE.md` does the same job and is read by every session on every platform, with no
shell execution. It is also the safer choice for a public repository: a command hook
would run a script on the machine of everyone who opens the project.

## Keeping them current

This is a snapshot, not a dependency. It does not update when upstream does, and
nothing here warns you when it falls behind. Refresh it deliberately by copying from
upstream again and recording the new version in this file.

Do not edit these files to suit huemi. A local change is invisible to anyone reading
upstream and is lost on the next refresh. If a skill needs to behave differently for
this project, say so in `CLAUDE.md`, which takes precedence over skill instructions.
