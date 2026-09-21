import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

/**
 * The two lines of text every block carries. Shared rather than repeated
 * because a base block and a suggestion block sitting one above the other
 * with different type would read as two different kinds of thing.
 */
export const blockText = stylex.create({
  slot: {
    fontSize: '0.68rem',
    fontWeight: 500,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    opacity: 0.75,
  },
  name: {
    fontFamily: tokens.fontHeading,
    fontSize: tokens.textBody,
    fontWeight: 500,
  },
  position: {
    fontSize: '0.72rem',
    opacity: 0.72,
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
