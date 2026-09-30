# 0015. Deploy with Netlify's Git integration

Status: Accepted, 2026-09-30

## Context

huemi is a static build (ADR 0001) with no server, so any static host would serve it.
Two things narrowed the choice. The camera only works on an HTTPS origin, and the
remaining milestone six work needs a real one: the offline shell (#26) and the closing
accessibility audit (#28) both behave differently on a deployed origin than on the dev
server. Every pull request should also get its own URL, so a reviewer can open a change
on a phone.

The repository is public and `all-green` is the only required check. Whatever deploys
the app must not add a second one, and must not break for a pull request from a fork.

## Decision

Netlify's GitHub integration builds `main` for production and every pull request for a
preview. The build, the publish directory, the response headers and the cache rules
live in `netlify.toml`. No workflow deploys anything.

A GitHub Actions job running the Netlify CLI was the other option. It needs an
authentication token in a repository secret, which fork pull requests never receive, so
the job would fail for outside contributors the way the Codecov upload would have
without its fork guard. It would also have to join `all-green`'s `needs`, and every run
would pay for a second build.

The headers set the camera policy to `camera=(self)` and turn off the microphone and
geolocation, add `nosniff`, a referrer policy and `X-Frame-Options: DENY`, and give
everything under `/assets/` a one-year immutable cache. Vite hashes those file names.
`index.html` keeps Netlify's default revalidation, so a new deploy reaches returning
visitors.

The immutable cache has a catch that showed up on the first preview. Headers match the
request path, and the single-page fallback answers for any path with no file. A removed
bundle under `/assets/` therefore came back as `index.html` with status 200 and the
one-year cache header, so a visitor holding an old page got HTML where the script should
be, and their browser kept it. `public/_redirects` now answers `/assets/*` with a 404
ahead of the fallback. Netlify tries real files first, so existing assets are unaffected.

## Consequences

Production builds in parallel with CI, so a broken `main` could publish before its checks
finish. That cannot happen in practice, because `main` only advances through a pull
request that already passed `all-green`.

The Netlify build cannot run in CI. `netlify.config.test.ts` pins the parts of the
config that would break the deployed site without failing anything else: the camera
policy, the immutable cache staying on `/assets/`, the publish directory, and the
single-page fallback in `public/_redirects`. The first real check of a change to any of
them is its preview deploy.

There is no Content-Security-Policy. StyleX and Vite together make a correct one a piece
of work with its own testing, and a wrong one would break the app in ways the unit tests
cannot see. Adding one means editing the guard test, which asserts its absence, and this
record.

`camera=(self)` has to keep in step with the app. A feature that uses another device API,
or that embeds the app in a frame, needs the headers changed with it.

The service worker's cache rule belongs to #26, since it depends on the file name that
issue picks.

The Netlify site itself is created and connected by hand in Netlify's dashboard. The
repository holds only the configuration.
