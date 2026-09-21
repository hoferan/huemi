// Inline rather than StyleX: a visually hidden region has to keep its
// dimensions and clip exactly, and this is the one place in the app where the
// style is a screen-reader contract rather than a design decision.
export const SR_ONLY = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;
