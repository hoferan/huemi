import { Link, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { Camera, Palette } from 'lucide-react';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { HOME } from '../../ui/home';
import { DevSlot } from '../../ui/DevSlot';
import { Screen } from '../../ui/Screen';
import { CHECK_ENTRY } from '../check/copy';
import { InstallButton } from '../install/InstallButton';
import { clearOfToasts } from '../../ui/toastClearance';
import { WayIn } from './WayIn';

const styles = stylex.create({
  wordmark: {
    color: tokens.ink,
    fontFamily: tokens.fontHeading,
    fontSize: tokens.textBody,
    margin: 0,
  },
  brand: { display: 'flex', alignItems: 'center' },
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
  // The two ways in take the screen's height, and anything a tall window has
  // left over sits above them, so they stay where the thumb is.
  actions: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: '8px',
  },
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
 * The two ways in are the screen's content, so they fill it as two large
 * cards, each with a line on when to use it. That line replaced the
 * paragraph that used to sit above two plain buttons and a large empty
 * space (PO, 2026-10-02).
 *
 * The camera leads because photographing a garment you own is the faster
 * path, a choice André made on 2026-09-24 over putting the picker first or
 * asking for the method after the slot.
 */
export function Entry() {
  const navigate = useNavigate();

  return (
    <Screen
      title={HOME.title}
      header={
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.brand)}>
            <p {...stylex.props(styles.wordmark)}>huemi</p>
            <DevSlot name="screen.badge" context={{}} />
          </div>
          <Link to="/saved" {...stylex.props(styles.saved)}>
            Saved
          </Link>
        </div>
      }
    >
      <div {...clearOfToasts} {...stylex.props(styles.actions)}>
        <WayIn
          icon={Camera}
          label="Take a photo"
          note="of something you own"
          onClick={() => void navigate('/slot?next=camera')}
        />
        <WayIn
          icon={Palette}
          label="Pick a color"
          note="if you know it"
          variant="secondary"
          onClick={() => void navigate('/slot')}
        />
        {/*
          The check is huemi's second job, for someone already dressed rather
          than starting from one garment, so it sits below the two ways into
          suggestions as a quiet button: it names when to use it and does not
          compete with them (PO, 2026-09-26).
        */}
        <Button variant="quiet" label={CHECK_ENTRY} onClick={() => void navigate('/check')} />
        <InstallButton />
      </div>
    </Screen>
  );
}
