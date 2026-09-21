import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { localPreferences } from '../../storage/localPreferences';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';

const styles = stylex.create({
  body: {
    color: tokens.ink2,
    fontSize: tokens.textBody,
    lineHeight: 1.5,
    margin: 0,
  },
  spacer: { flex: '1' },
});

/**
 * Shown once, and nothing else is on the screen.
 *
 * No skip control: this is three sentences behind one button, and a control
 * whose only job is to dismiss a screen a single tap already dismisses is
 * chrome explaining itself away. No paged steps either, since each step would
 * be another focus move to manage and a position indicator needing a text
 * equivalent, bought for three sentences.
 *
 * When `localStorage` throws, `setOnboarded` resolves anyway and the flag
 * never sticks, so this screen returns next visit. That is the accepted cost
 * of the preference store degrading rather than failing; the alternative is a
 * blocking error about a screen the user has already read.
 */
export function Onboarding() {
  const navigate = useNavigate();

  async function start() {
    await localPreferences.setOnboarded(true);
    // Shown once, so the entry screen replaces this history entry rather
    // than sitting behind it: back has to leave the app, not replay
    // onboarding from /welcome.
    void navigate('/', { replace: true });
  }

  return (
    <Screen title="One piece you own. The rest that goes with it." documentTitle="Welcome">
      <p {...stylex.props(styles.body)}>
        <span>Pick the color of one garment.</span>
        <br />
        <span>See what works for the rest.</span>
        <br />
        <span>Keep the outfits you like.</span>
      </p>
      <div {...stylex.props(styles.spacer)} />
      <Button label="Start" onClick={() => void start()} />
    </Screen>
  );
}
