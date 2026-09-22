import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

/**
 * The alpha block text is drawn at. `readableForeground` only guarantees
 * 4.5:1 (worst case 4.58:1, see A11Y.md) at alpha 1 — compositing it over an
 * arbitrary garment color at any lower alpha moves it toward the background
 * and strictly reduces contrast, so this must stay 1. Pinned by the sweep in
 * blockText.test.ts.
 */
export const BLOCK_TEXT_ALPHA = 1;

/**
 * The two lines of text every block carries. Shared rather than repeated
 * because a base block and a suggestion block sitting one above the other
 * with different type would read as two different kinds of thing.
 *
 * Hierarchy between the lines comes from size, weight, letter-spacing and
 * case only, never opacity: the foreground is whatever `readableForeground`
 * chose for the block, and translucing it is not safe on every palette
 * color (see BLOCK_TEXT_ALPHA).
 */
export const blockText = stylex.create({
  slot: {
    fontSize: '0.68rem',
    fontWeight: 500,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: tokens.fontHeading,
    fontSize: tokens.textBody,
    fontWeight: 500,
  },
  position: {
    fontSize: '0.72rem',
  },
});

/**
 * The field layout shared between base and suggestion blocks. The base block
 * uses it as-is on a `<div>`. The suggestion block composes it on a `<button>`
 * and adds button-specific properties.
 */
export const fieldLayout = stylex.create({
  field: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: 0,
    paddingBlock: '8px',
    paddingInlineStart: '14px',
    paddingInlineEnd: '4px',
  },
});
