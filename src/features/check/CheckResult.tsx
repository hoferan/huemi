import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { alternativesFor, checkOutfit, type Observation } from '../../color/check';
import { CHECK_SLOTS, SLOT_AREA, type CheckSlot } from '../../model/types';
import { checkedPieces } from '../../session/select';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { useAnnounce } from '../../ui/useAnnounce';
import { Alternatives } from '../suggest/Alternatives';
import { CheckBlock } from './CheckBlock';
import {
  CHANGE_PIECES,
  CHECK_ANOTHER,
  CHECK_TITLE,
  SWAP_HINT,
  backTo,
  observationText,
  swapSheetTitle,
  swappedTo,
  yoursLabel,
} from './copy';

const styles = stylex.create({
  blocks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexGrow: 1,
    minHeight: '18rem',
  },
  // Area as height: a coat block is taller than a shoes block because the
  // coat is more of what the eye sees, the same weighting the engine uses.
  area: (share: number) => ({ flexGrow: share }),
  hint: { color: tokens.ink2, fontSize: '0.875rem', margin: 0 },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  row: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    paddingBlock: '10px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.line,
    color: tokens.ink,
    fontSize: tokens.textBody,
    lineHeight: 1.45,
  },
  pair: { display: 'flex', flexShrink: 0, paddingTop: '3px' },
  swatch: (hex: string) => ({ backgroundColor: hex, width: '16px', height: '22px' }),
  first: { borderStartStartRadius: '4px', borderEndStartRadius: '4px' },
  last: { borderStartEndRadius: '4px', borderEndEndRadius: '4px' },
  actions: { display: 'flex', gap: '8px' },
});

/** Up to two swatches, decorative: the sentence beside them names the pieces. */
function Swatches({ observation }: { observation: Observation }) {
  const shown = observation.pieces.slice(0, 2);
  return (
    <span aria-hidden="true" {...stylex.props(styles.pair)}>
      {shown.map((piece, index) => (
        <span
          key={piece.slot}
          {...stylex.props(
            styles.swatch(piece.hex),
            index === 0 && styles.first,
            index === shown.length - 1 && styles.last,
          )}
        />
      ))}
    </span>
  );
}

/**
 * How a checked outfit works together, and a what-if swap for any piece.
 *
 * Describes and never judges (ADR 0014): no number, no count, no piece to
 * blame. Swaps are laid over what is worn rather than written into it, so the
 * list still shows the real outfit and a swap never reaches the correction
 * log. The photo is not shown: the blocks carry the corrected colors, and a
 * hand-entered check has none (PO, 2026-09-25).
 */
export function CheckResult() {
  const { state, dispatch } = useSession();
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [openFor, setOpenFor] = useState<CheckSlot | null>(null);

  const check = state.check;
  if (!check) return <Navigate to="/check" replace />;
  const pieces = checkedPieces(check);
  const observations = checkOutfit(pieces);
  // A refresh keeps the route and loses the session: never describe an
  // outfit that is not there.
  if (!observations) return <Navigate to="/check/pieces" replace />;

  const openPiece = openFor === null ? undefined : check.pieces[openFor];

  return (
    <Screen title={CHECK_TITLE}>
      <div {...stylex.props(styles.blocks)}>
        {CHECK_SLOTS.map((slot) => {
          const hex = pieces[slot];
          if (!hex) return null;
          return (
            <CheckBlock
              key={slot}
              slot={slot}
              hex={hex}
              swapped={check.swaps[slot] !== undefined}
              style={styles.area(SLOT_AREA[slot])}
              onSwap={() => setOpenFor(slot)}
            />
          );
        })}
      </div>
      <p {...stylex.props(styles.hint)}>{SWAP_HINT}</p>
      <ul aria-label={CHECK_TITLE} {...stylex.props(styles.list)}>
        {observations.map((observation) => (
          <li key={observation.term} {...stylex.props(styles.row)}>
            <Swatches observation={observation} />
            <span>{observationText(observation)}</span>
          </li>
        ))}
      </ul>
      <div {...stylex.props(styles.actions)}>
        <Button
          variant="secondary"
          label={CHANGE_PIECES}
          onClick={() => void navigate('/check/pieces')}
        />
        {/*
          Only navigates: arriving at /check starts a new check. Emptying it
          here first would redraw this screen with no outfit, and its own
          redirect to the list would win over this navigation.
        */}
        <Button label={CHECK_ANOTHER} onClick={() => void navigate('/check')} />
      </div>
      {openFor !== null && openPiece && (
        <Sheet
          open
          onOpenChange={(next) => !next && setOpenFor(null)}
          title={swapSheetTitle(openFor)}
        >
          <Alternatives
            options={alternativesFor(pieces, openFor)}
            current={check.swaps[openFor] ?? null}
            lead={{
              hex: openPiece.hex,
              label: yoursLabel(openPiece.hex),
              current: check.swaps[openFor] === undefined,
              onChoose: () => {
                dispatch({ type: 'checkSwapCleared', slot: openFor });
                announce(backTo(openFor, openPiece.hex));
                setOpenFor(null);
              },
            }}
            onChoose={(hex) => {
              dispatch({ type: 'checkSwapped', slot: openFor, hex });
              announce(hex === openPiece.hex ? backTo(openFor, hex) : swappedTo(openFor, hex));
              setOpenFor(null);
            }}
          />
        </Sheet>
      )}
    </Screen>
  );
}
