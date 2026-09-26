import { Link, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { CHECK_ENTRY } from '../check/copy';

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
  actions: { display: 'flex', flexDirection: 'column', gap: '8px' },
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
 * The header holds the wordmark and the way into the saved collection.
 *
 * The camera leads because photographing a garment you own is the faster
 * path, a choice André made on 2026-09-24 over putting the picker first or
 * asking for the method after the slot.
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
        Photograph something you already own, or choose its color, and huemi suggests the rest.
      </p>
      <div {...stylex.props(styles.spacer)} />
      <div {...stylex.props(styles.actions)}>
        <Button label="Take a photo" onClick={() => void navigate('/slot?next=camera')} />
        <Button variant="secondary" label="Pick a color" onClick={() => void navigate('/slot')} />
        {/*
          The check is huemi's second job, for someone already dressed rather
          than starting from one garment, so it sits below the two ways into
          suggestions as a quiet button: it names when to use it and does not
          compete with them (PO, 2026-09-26).
        */}
        <Button variant="quiet" label={CHECK_ENTRY} onClick={() => void navigate('/check')} />
      </div>
    </Screen>
  );
}
