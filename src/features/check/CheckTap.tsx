import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Redirect } from '../../ui/Redirect';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../../color/contrast';
import { readColor, tapRegion } from '../../color/read';
import type { Pixels } from '../../model/frame';
import { checkSlots } from '../../model/shape';
import type { CheckSlot } from '../../model/types';
import { useSession } from '../../session/useSession';
import type { CheckPiece } from '../../session/types';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { useAnnounce } from '../../ui/useAnnounce';
import { FramePhoto } from '../confirm/FramePhoto';
import { TOP_AND_BOTTOM } from '../suggest/copy';
import { CAPTURE_TITLE, ENTER_COLORS, IT_IS_A_DRESS, SKIP, TAP_PROMPTS, TAP_UNCLEAR } from './copy';
import { tapOutcome } from './sequence';
import { clearOfToasts } from '../../ui/toastClearance';

// `chipFill` is the only dynamic entry, and StyleX compiles it into a
// null-guard no caller reaches; see Confirm.tsx for why the ignore has to
// bracket the whole object.
/* v8 ignore start */
const styles = stylex.create({
  strip: { display: 'flex', gap: '6px' },
  chip: { flex: '1', height: '24px', borderRadius: tokens.radiusMedia },
  chipEmpty: { borderWidth: '1px', borderStyle: 'dashed', borderColor: tokens.ink2 },
  // Dynamic: the color is a runtime value (ADR 0002).
  chipFill: (background: string) => ({ backgroundColor: background }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  actions: { display: 'flex', gap: '8px' },
  body: { color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5, margin: 0 },
  // Picker.tsx's link style: a link is a hit target (A11Y.md).
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touchTarget,
    color: tokens.ink,
    fontSize: tokens.textBody,
    textAlign: 'center',
  },
});
/* v8 ignore stop */

/**
 * Reading an outfit photo one piece at a time: the app names a slot, the user
 * taps that piece, and the circle around the tap is read the way the confirm
 * screen reads one.
 *
 * Chosen by André on 2026-09-25 from mocks, over reading fixed zones of the
 * photo without taps, and over tapping pieces in any order and then labelling
 * each one. Fixed zones cannot tell a jacket from the top under it, and a step
 * back or a busy wall reads as a garment; doing better needs a segmentation
 * model, which is heavy to download and works against offline use. Tapping
 * in any order costs two steps per piece. Recorded on #23.
 *
 * The top step offers "It's a dress", which asks for a dress in place of the
 * top and the bottom (#137), and the dress step offers "Top and bottom" back.
 * Both swap the step in place, so the count is of the steps actually walked:
 * four with a top and a bottom, three with a dress.
 *
 * Tapping needs a pointer. Skip and "Enter the colors" are always on screen,
 * so a keyboard or switch user reaches the list, where every piece can be set.
 */
export function CheckTap() {
  const { state } = useSession();
  const check = state.check;
  // The photo lives only in the in-memory session, so a refresh lands here
  // with nothing to tap.
  if (!check?.photo) return <Redirect to="/check" />;
  return <TapPieces pixels={check.photo.pixels} pieces={check.pieces} dress={check.dress} />;
}

function TapPieces({
  pixels,
  pieces,
  dress,
}: {
  pixels: Pixels;
  pieces: Partial<Record<CheckSlot, CheckPiece>>;
  dress: boolean;
}) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [index, setIndex] = useState(0);
  const [miss, setMiss] = useState<{ x: number; y: number } | null>(null);
  const steps = checkSlots(dress);
  // The dress takes the top's place in the steps, so switching between them
  // keeps the index and lands on the other one.
  const slot = steps[index]!;

  function advance() {
    setMiss(null);
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      return;
    }
    void navigate('/check/pieces');
  }

  function onTap(x: number, y: number) {
    const outcome = tapOutcome(readColor(pixels, tapRegion(pixels, x, y)));
    if (outcome.kind === 'retry') {
      // Nothing else on the screen changes, so the live region carries it.
      setMiss({ x, y });
      announce(TAP_UNCLEAR);
      return;
    }
    dispatch({ type: 'checkPieceSet', slot, hex: outcome.hex });
    advance();
  }

  function chooseDress(next: boolean) {
    setMiss(null);
    dispatch({ type: 'checkDressChosen', dress: next });
  }

  return (
    // The key remounts Screen on each new slot, which moves focus to the new
    // prompt, as the confirm screen does on a change of state.
    <Screen
      key={slot}
      title={TAP_PROMPTS[slot]}
      back={{ to: '/check', title: CAPTURE_TITLE }}
      headingNote={`${index + 1} of ${steps.length}`}
    >
      <FramePhoto pixels={pixels} fit="contain" onTap={onTap} {...(miss && { mark: miss })} />
      {/* Drawn progress. The heading note says the same in words. */}
      <div aria-hidden="true" {...stylex.props(styles.strip)}>
        {steps.map((each) => {
          const hex = pieces[each]?.hex;
          return (
            <span
              key={each}
              {...stylex.props(
                styles.chip,
                hex ? styles.chipFill(hex) : styles.chipEmpty,
                hex && needsBorder(hex) && styles.hairline,
              )}
            />
          );
        })}
      </div>
      {miss && <p {...stylex.props(styles.body)}>{TAP_UNCLEAR}</p>}
      <div {...clearOfToasts} {...stylex.props(styles.actions)}>
        {slot === 'top' && (
          <Button variant="secondary" label={IT_IS_A_DRESS} onClick={() => chooseDress(true)} />
        )}
        {slot === 'dress' && (
          <Button variant="secondary" label={TOP_AND_BOTTOM} onClick={() => chooseDress(false)} />
        )}
        <Button variant="secondary" label={SKIP} onClick={advance} />
      </div>
      <Link to="/check/pieces" {...clearOfToasts} {...stylex.props(styles.link)}>
        {ENTER_COLORS}
      </Link>
    </Screen>
  );
}
