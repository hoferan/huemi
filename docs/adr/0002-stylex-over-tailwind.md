# 0002. Style with StyleX rather than Tailwind

Status: Accepted, 2026-09-16

## Context

Color is the content in this app, not decoration. The brief is blunt about what
that demands: surrounding hues shift how a color is perceived, so saturated chrome,
colored buttons and decorative accents actively mislead the user. The interface has
to stay out of the way, in neutral greys, with generous separation between color
areas.

That puts unusual weight on the token layer. The palette, the foreground pair, the
swatch border rule and the motion durations are a contract that later milestones
have to honor exactly, because breaking one of them is an accessibility defect
rather than a visual inconsistency.

The other unusual demand is that almost every color in the app is a runtime value.
Garment colors come from a camera reading, a free picker, or saved data. They cannot
be compile-time constants.

## Decision

StyleX, with design tokens defined through `defineVars` in `src/styles/tokens.stylex.ts`.

Tailwind was ruled out.

## Consequences

Tokens are typed. A reference to a token that no longer exists is a compile error
rather than a silently missing custom property, which is what makes the contrast
contract enforceable instead of remembered.

Runtime colors work through StyleX's dynamic styles, which compile to CSS custom
properties set at call time. This was proven in milestone one with a deliberate
spike rather than assumed, because six screens depend on it.

That spike was retired in milestone three when the entry screen replaced it, and
for two pull requests nothing in the app rendered a runtime color at all. The
picker's swatches restored it: `e2e/features/pick.feature` asserts that two
palette entries reach the browser with their own hex values, through a dynamic
style rather than a token. The property is demonstrated again, this time by the
screen that depends on it rather than by a spike built to prove it.

Motion durations live in the token file specifically so a single
`prefers-reduced-motion` rule can zero them, rather than chasing inline transition
values across five milestones.

The costs are real. The ecosystem is far smaller than Tailwind's, so component
libraries that ship styles are unusable, which forces decision 0003. There is no
equivalent of the prototype's inline hover attribute, so every hover state becomes a
pseudo-selector in a style object.

StyleX emits no CSS under Vitest. Its Vite plugin injects the aggregated stylesheet
from a build hook that Vitest never calls, so anything about rendered color or
computed style has to be asserted in Playwright against a real build. This is
recorded in `CLAUDE.md` because it is the kind of trap that costs an afternoon.

Two setup constraints are load-bearing and easy to break. The StyleX plugin must
come before the React plugin or Fast Refresh stops working, and with CSS layers
enabled any unlayered stylesheet overrides every StyleX style, so the reset lives
inside a layer.
