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
export const SR_ONLY = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;
