import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

/**
 * The round, icon-only button a screen's header carries: Save and Share on
 * the suggestions screen. One style, so the two cannot drift apart where
 * they sit side by side.
 */
export const headerButton = stylex.create({
  button: {
    display: 'grid',
    placeItems: 'center',
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: '999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    backgroundColor: { default: 'transparent', ':hover': tokens.surface },
    color: tokens.ink,
    cursor: 'pointer',
  },
});
