import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

const styles = stylex.create({
  button: {
    backgroundColor: tokens.primary,
    color: tokens.primaryFg,
    borderStyle: 'none',
    borderRadius: tokens.radius,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
    // The token, never a repeated literal: A11Y.md carries this as an
    // invariant, and a literal is how it stops being one.
    minHeight: tokens.touchTarget,
    paddingBlock: '12px',
    paddingInline: '20px',
    width: '100%',
    cursor: 'pointer',
  },
});

/**
 * The one call to action on a screen.
 *
 * `type="button"` explicitly: the default inside a form is `submit`, and a
 * screen that later grows a form would start navigating on Enter with no
 * change to this file.
 */
export function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} {...stylex.props(styles.button)}>
      {label}
    </button>
  );
}
