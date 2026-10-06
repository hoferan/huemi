import { Link } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';

const styles = stylex.create({
  // Grey on purpose: the chip says the mode is on without drawing the eye
  // away from the colors the screen is about.
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    paddingInline: '8px',
    color: tokens.ink2,
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textDecoration: 'none',
  },
  // The visible chip is smaller than its 44px target.
  chip: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: '6px',
    paddingBlock: '2px',
    paddingInline: '6px',
  },
});

/** The chip that shows developer mode is on, and the way into its menu. */
export function DevBadge() {
  return (
    <Link to="/dev" aria-label="Developer mode" {...stylex.props(styles.badge)}>
      <span {...stylex.props(styles.chip)}>DEV</span>
    </Link>
  );
}
