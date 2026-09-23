// Inline rather than StyleX: a visually hidden region has to keep its
// dimensions and clip exactly, and this is the one place in the app where the
// style is a screen-reader contract rather than a design decision.
//
// `clip-path` does the hiding, not `overflow: hidden`. A 1px box can never
// contain a line of text, so an announcement or a swatch's name always makes
// this element's own scrollHeight exceed its clientHeight — that is what
// visually hides it. `overflow: hidden` would report that as a clipped
// element with unreachable content to `e2e/invariants.spec.ts`'s 200% text
// size check, which cannot tell a real layout clip from a deliberate one.
// `clip-path: inset(50%)` clips the paint to nothing without setting
// `overflow`, so the computed `overflow-y` stays `visible` and the check
// leaves it alone. The legacy `clip` property stays as a belt-and-braces
// fallback; it does not affect the computed `overflow-y` either.
//
// There is no `white-space: nowrap` here, on purpose: text wraps at its
// word boundaries inside the 1px box, so it grows tall instead of wide.
// `nowrap` was tried and reverted. It keeps a longer description, such as a
// saved card's list of pieces, on one line far wider than the box, and even
// though `clip-path` still paints none of it, an unclipped line that wide
// still counts toward the document's horizontal scroll extent, which
// `e2e/invariants.spec.ts`'s no-horizontal-scroll check catches. Clipping
// that with `overflow-x: hidden` trades one failure for another: axe's
// `scrollable-region-focusable` then flags the span itself as a scrollable
// region with no way to reach it by keyboard.
export const SR_ONLY = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  border: 0,
} as const;
