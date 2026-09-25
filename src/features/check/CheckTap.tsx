import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../../color/contrast';
import { readColor, tapRegion } from '../../color/read';
import type { Pixels } from '../../model/frame';
import { CHECK_SLOTS, type CheckSlot } from '../../model/types';
import { useSession } from '../../session/useSession';
import type { CheckPiece } from '../../session/types';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { useAnnounce } from '../../ui/useAnnounce';
import { FramePhoto } from '../confirm/FramePhoto';
import { ENTER_COLORS, SKIP, TAP_PROMPTS, TAP_UNCLEAR } from './copy';
import { tapOutcome } from './sequence';

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
 * Tapping needs a pointer. Skip and "Enter the colors" are always on screen,
 * so a keyboard or switch user reaches the list, where every piece can be set.
 */
export function CheckTap() {
  const { state } = useSession();
  const check = state.check;
  // The photo lives only in the in-memory session, so a refresh lands here
  // with nothing to tap.
  if (!check?.photo) return <Navigate to="/check" replace />;
  return <TapPieces pixels={check.photo.pixels} pieces={check.pieces} />;
}

function TapPieces({
  pixels,
  pieces,
}: {
  pixels: Pixels;
  pieces: Partial<Record<CheckSlot, CheckPiece>>;
}) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [index, setIndex] = useState(0);
  const [miss, setMiss] = useState<{ x: number; y: number } | null>(null);
  const slot = CHECK_SLOTS[index]!;

  function advance() {
    setMiss(null);
    if (index + 1 < CHECK_SLOTS.length) {
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
    dispatch({
      type: 'checkPieceSet',
      slot,
      hex: outcome.hex,
      ...(outcome.read && { read: outcome.read }),
    });
    advance();
  }

  return (
    // The key remounts Screen on each new slot, which moves focus to the new
    // prompt, as the confirm screen does on a change of state.
    <Screen
      key={slot}
      title={TAP_PROMPTS[slot]}
      headingNote={`${index + 1} of ${CHECK_SLOTS.length}`}
    >
      <FramePhoto pixels={pixels} fit="contain" onTap={onTap} {...(miss && { mark: miss })} />
      {/* Drawn progress. The heading note says the same in words. */}
      <div aria-hidden="true" {...stylex.props(styles.strip)}>
        {CHECK_SLOTS.map((each) => {
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
      <Button variant="secondary" label={SKIP} onClick={advance} />
      <Link to="/check/pieces" {...stylex.props(styles.link)}>
        {ENTER_COLORS}
      </Link>
    </Screen>
  );
}
