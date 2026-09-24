import { Link, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';

const styles = stylex.create({
  wordmark: {
    color: tokens.ink,
    fontFamily: tokens.fontHeading,
    fontSize: tokens.textBody,
    margin: 0,
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  saved: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    paddingInline: '8px',
    color: tokens.ink,
    fontSize: tokens.textBody,
  },
  body: {
    color: tokens.ink2,
    fontSize: tokens.textBody,
    lineHeight: 1.5,
    margin: 0,
  },
  spacer: { flex: '1' },
});

/**
 * Text led rather than colour led.
 *
 * A row of palette blocks would say what the app is for before any words
 * explained it, which suits an app named after colour blocking. It was
 * rejected because no colour judgement happens on this screen, so the blocks
 * would be decoration, and the brief is explicit that colour is the content
 * and the interface around it has to stay out of the way.
 *
 * The header holds the wordmark and the way into the saved collection. The
 * camera route exists from #19 but joins them only with #21, once a capture
 * has somewhere to go.
 */
export function Entry() {
  const navigate = useNavigate();

  return (
    <Screen
      title="Start with a garment"
      header={
        <div {...stylex.props(styles.header)}>
          <p {...stylex.props(styles.wordmark)}>huemi</p>
          <Link to="/saved" {...stylex.props(styles.saved)}>
            Saved
          </Link>
        </div>
      }
    >
      <p {...stylex.props(styles.body)}>
        Choose the color of something you already own, and huemi suggests the rest.
      </p>
      <div {...stylex.props(styles.spacer)} />
      <Button label="Pick a color" onClick={() => void navigate('/slot')} />
    </Screen>
  );
}
