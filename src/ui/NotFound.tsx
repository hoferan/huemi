import { Link } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import { Screen } from './Screen';

const styles = stylex.create({
  // A link is a hit target the same as a button (A11Y.md), so it carries the
  // same token. `inline-flex` rather than the anchor's default `inline` lets
  // `minHeight` take effect at all, and centres the text inside that height
  // instead of leaving it sitting in a band of dead space below the words.
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
  },
});

export function NotFound() {
  return (
    <Screen title="Page not found">
      <p>That address does not lead anywhere in huemi.</p>
      <Link to="/" {...stylex.props(styles.link)}>
        Start again
      </Link>
    </Screen>
  );
}
