# huemi

A color-blocking web application.

## Getting started

Node 24.21.0, pinned in `.nvmrc`.

```bash
npm ci
```

|                         |                                 |
| ----------------------- | ------------------------------- |
| `npm run dev`           | Dev server                      |
| `npm run build`         | Production build                |
| `npm test`              | Unit tests                      |
| `npm run test:coverage` | Unit tests with coverage        |
| `npm run e2e`           | Playwright, needs a build first |
| `npm run lint`          | ESLint                          |
| `npm run typecheck`     | `tsc --noEmit`                  |

See `CLAUDE.md` for the full stack and its pinning policy, `docs/design/` for
the design record, and `A11Y.md` for the accessibility invariants.

## Layout

| Path             | Purpose                              |
| ---------------- | ------------------------------------ |
| `CLAUDE.md`      | Conventions for Claude Code sessions |
| `SECURITY.md`    | How to report a vulnerability        |
| `.editorconfig`  | Whitespace and encoding rules        |
| `.gitattributes` | Line endings and diff behavior       |
| `LICENSE`        | MIT                                  |

## Working on it

Branch off `main`, commit, open a pull request. `main` is protected, so a direct
push to it will be rejected.

Branch names use a `feat/`, `fix/`, `chore/` or `docs/` prefix. Commit messages
follow Conventional Commits. Pull requests merge by squash, so the title and body
of the pull request become the commit that lands on `main`.

## License

MIT. See [LICENSE](LICENSE).
