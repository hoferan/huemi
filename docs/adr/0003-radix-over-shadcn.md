# 0003. Use Radix primitives rather than shadcn/ui

Status: Accepted, 2026-09-16

## Context

The designs need several components that are difficult to build correctly and
dangerous to build badly: three bottom sheets, sliders for hue, saturation,
lightness and a lighting correction, a toast, and a panel of alternatives. Each
carries focus management and screen-reader behavior that is easy to get subtly
wrong.

shadcn/ui was the obvious candidate. It is not compatible with decision 0002:
shadcn ships its components styled with Tailwind utility classes, and that coupling
is the product rather than an implementation detail. Using it alongside StyleX would
mean stripping and rewriting the styling of every component as it was copied in,
leaving a fork of shadcn with none of its benefit and all of its maintenance.

## Decision

Radix UI primitives, through the unified `radix-ui` package, styled entirely with
StyleX. Icons from `lucide-react`.

Radix is what shadcn is built on, so this takes the layer that carries the
accessibility work and leaves the layer that carries the Tailwind coupling.

Lucide is not an arbitrary pick. The prototype's inline SVGs are Lucide icons: the
same 24 by 24 viewBox, the same rounded line caps, and a back chevron whose path is
Lucide's own. Adopting it reproduces the design rather than approximating it. The
prototype draws them at stroke width 2.75 rather than Lucide's default of 2, and
that value belongs on the icon wrapper.

## Consequences

Radix handles focus trapping in the sheets and gives the toast its live region,
which are two of the requirements the handoff notes call for and the prototype never
implemented.

Radix ships no CSS, exposes state through data attributes, and forwards both
`className` and `style`, which is exactly the pair StyleX produces. The two compose
without adapters.

Two gaps are real and budgeted rather than assumed away. Radix Dialog has no
drag-to-dismiss and no spring, and the handoff notes require both, so that drag is
hand-written. Radix Toast queues, while the notes require one toast at a time with a
new one replacing the current, so a single-slot controller sits above the provider.

Radix announces nothing when a grid re-sorts, so the season sort announcement in the
color picker is application code.

Tokens stay global through `defineVars` rather than scoped to a wrapper element,
because dialogs, popovers and toasts all render through portals and would fall
outside any wrapper that carried a scoped theme.
