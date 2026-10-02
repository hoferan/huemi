// Inline rather than StyleX: a visually hidden region has to keep its
// dimensions and clip exactly, and this is the one place in the app where the
// style is a screen-reader contract rather than a design decision.
//
// `clip-path` does the hiding, not `overflow: hidden`. A 1px box can never
// contain a line of text, so an announcement always makes this element's own
// scrollHeight exceed its clientHeight, which is what visually hides it.
// `overflow: hidden` would report that as a clipped
// element with unreachable content to `e2e/invariants.spec.ts`'s 200% text
// size check, which cannot tell a real layout clip from a deliberate one.
// `clip-path: inset(50%)` clips the paint to nothing without setting
// `overflow`, so the computed `overflow-y` stays `visible` and the check
// leaves it alone. The legacy `clip` property stays as a belt-and-braces
// fallback; it does not affect the computed `overflow-y` either.
//
// Clipping the paint does not clip the layout, though: the text still
// overflows the box, and that overflow still counts towards the scrollable
// size of the page. The live region sits at the foot of the document, so
// every announcement left a line of blank page to scroll to below the
// screen, and a long one widened the layout viewport past the phone.
// `contain: paint` confines the overflow to the box, for scrolling as well
// as for painting, and it too leaves the computed `overflow-y` alone.
// `e2e/invariants.spec.ts` checks the page stays the same size.
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
  contain: 'paint',
} as const;
