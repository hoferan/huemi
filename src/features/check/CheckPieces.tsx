import { useState } from 'react';
import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../../color/contrast';
import { blockLabel, colorName, PALETTE } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { CHECK_SLOTS, SLOT_LABELS, type CheckSlot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { localCorrections } from '../../storage/localCorrections';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { Swatch } from '../../ui/Swatch';
import { useAnnounce } from '../../ui/useAnnounce';
import { CHECK_IT, NEED_TWO, NOT_SET, NOT_WEARING, PIECES_BODY, PIECES_TITLE } from './copy';

// `fill` is the only dynamic entry; see Confirm.tsx for why the ignore has to
// bracket the whole object.
/* v8 ignore start */
const styles = stylex.create({
  body: { color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5, margin: 0 },
  rows: { display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' },
  row: {
    flex: '1',
    minHeight: tokens.touchTarget,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    paddingInline: '18px',
    borderRadius: tokens.radius,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
    textAlign: 'start',
    cursor: 'pointer',
  },
  empty: { boxShadow: `inset 0 0 0 1px ${tokens.ink2}` },
  // Dynamic: the color is a runtime value (ADR 0002).
  fill: (background: string, foreground: string) => ({
    backgroundColor: background,
    color: foreground,
  }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  label: { flex: '1', fontFamily: tokens.fontHeading, fontSize: '1.25rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  sheetBody: { display: 'flex', flexDirection: 'column', gap: '12px' },
});
/* v8 ignore stop */

/**
 * What the user is wearing, one row per checked slot (#23). Both routes into
 * a check end here: a photo arrives with the rows it read filled in, and
 * entering by hand arrives with them empty.
 *
 * The button stays enabled below two pieces and says why it did nothing,
 * rather than fading out. A faded button is low contrast, and on a touch
 * screen it cannot say what it is waiting for.
 *
 * A change to a row the photo read is a correction, logged against what the
 * photo said, as the confirm screen logs one. Emptying a row is not: not
 * wearing a jacket says nothing about how well the camera reads color. A
 * patterned piece carries no reading to correct either, the same rule the
 * confirm screen applies to its own several-color state.
 */
export function CheckPieces() {
  const { state, dispatch } = useSession();
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [open, setOpen] = useState<CheckSlot | null>(null);
  const [tooFew, setTooFew] = useState(false);
  const pieces = state.check?.pieces ?? {};
  const filled = CHECK_SLOTS.filter((slot) => pieces[slot]).length;

  function choose(slot: CheckSlot, hex: Hex) {
    const piece = pieces[slot];
    if (piece?.read && hex !== piece.hex && hex !== piece.read) {
      void localCorrections.record({
        slot,
        read: piece.read,
        corrected: hex,
        at: new Date().toISOString(),
      });
    }
    dispatch({ type: 'checkPieceSet', slot, hex });
    setOpen(null);
  }

  function clear(slot: CheckSlot) {
    dispatch({ type: 'checkPieceCleared', slot });
    setOpen(null);
  }

  function check() {
    if (filled >= 2) {
      void navigate('/check/result');
      return;
    }
    setTooFew(true);
    announce(NEED_TWO);
  }

  return (
    <Screen title={PIECES_TITLE}>
      <p {...stylex.props(styles.body)}>{PIECES_BODY}</p>
      <div {...stylex.props(styles.rows)}>
        {CHECK_SLOTS.map((slot) => {
          const hex = pieces[slot]?.hex;
          return (
            <button
              key={slot}
              type="button"
              aria-label={hex ? blockLabel(slot, hex) : `${SLOT_LABELS[slot]}: not set`}
              onClick={() => setOpen(slot)}
              {...stylex.props(
                styles.row,
                hex ? styles.fill(hex, readableForeground(hex).color) : styles.empty,
                hex && needsBorder(hex) && styles.hairline,
              )}
            >
              <span {...stylex.props(styles.label)}>{SLOT_LABELS[slot]}</span>
              <span>{hex ? colorName(hex) : NOT_SET}</span>
            </button>
          );
        })}
      </div>
      {tooFew && filled < 2 && <p {...stylex.props(styles.body)}>{NEED_TWO}</p>}
      <Button label={CHECK_IT} onClick={check} />
      {open && (
        <Sheet
          open
          onOpenChange={(next) => {
            if (!next) setOpen(null);
          }}
          title={SLOT_LABELS[open]}
        >
          <div {...stylex.props(styles.sheetBody)}>
            <div {...stylex.props(styles.grid)}>
              {PALETTE.map((color) => (
                <Swatch key={color.hex} hex={color.hex} onSelect={(hex) => choose(open, hex)} />
              ))}
            </div>
            {pieces[open] && (
              <Button variant="secondary" label={NOT_WEARING} onClick={() => clear(open)} />
            )}
          </div>
        </Sheet>
      )}
    </Screen>
  );
}
