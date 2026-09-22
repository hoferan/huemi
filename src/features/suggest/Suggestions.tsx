import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { Shuffle as ShuffleIcon } from 'lucide-react';
import { colorName } from '../../color/palette';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';
import { advance, composeOutfit, positionLabel } from '../../session/select';
import type { SlotPick } from '../../session/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { blockText, fieldLayout } from '../../ui/blockText';
import { ColorBlock } from '../../ui/ColorBlock';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { SuggestionBlock } from '../../ui/SuggestionBlock';
import { useAnnounce } from '../../ui/useAnnounce';
import { Alternatives } from './Alternatives';
import { useBaseParam } from './useBaseParam';

const styles = stylex.create({
  blocks: { display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 },
  // The base is the ground every suggestion is made against, so it reads
  // larger. The proportion is the prototype's.
  base: { flexGrow: 1.6 },
  // Sticky, never fixed. Shuffle is the screen's main action and at 200% text
  // the blocks push it past the fold, so it has to stay on screen — but a
  // sticky element keeps its space in the flow, so scrolling to the end puts
  // the last block above it rather than underneath. A fixed footer would
  // cover that block, which is exactly what the reachability check in
  // e2e/invariants.spec.ts exists to catch.
  footer: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBlock: '8px',
    backgroundColor: tokens.bg,
  },
  hint: { margin: 0, flexGrow: 1, fontSize: '0.875rem', color: tokens.ink2 },
  shuffle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: tokens.touchTarget,
    paddingInline: '16px',
    borderRadius: '999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    backgroundColor: { default: 'transparent', ':hover': tokens.surface },
    color: tokens.ink,
    font: 'inherit',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
});

/**
 * The core screen: a locked base colour, a suggested colour for every other
 * slot, and the two ways to move a suggestion — the block's own controls and
 * the alternatives sheet.
 *
 * The URL is the authority for the base, not the session. A deep link, a
 * refresh and a back navigation all arrive the same way, and reconciling
 * towards the parameters means there is no second source of truth to keep in
 * step. The session still holds the picks, because they are not in the URL.
 */
export function Suggestions() {
  const base = useBaseParam();
  const { state, dispatch } = useSession();

  // Computed during render as well as dispatched from the effect, because the
  // first paint happens before the effect runs and the blocks need colours
  // then. Safe only because the seed is deterministic: this is the same outfit
  // the dispatch below is about to put in the session, not a placeholder.
  const seed = useMemo(() => (base ? composeOutfit(base, {}, () => 0) : {}), [base]);

  const settled = base !== null && state.base?.slot === base.slot && state.base.hex === base.hex;
  const picks = settled ? state.picks : seed;

  useEffect(() => {
    if (!base || settled) return;
    dispatch({ type: 'baseChosen', slot: base.slot, hex: base.hex });
    dispatch({ type: 'picksReplaced', picks: seed });
  }, [base, settled, seed, dispatch]);

  const announce = useAnnounce();
  // Set for one shuffle's worth of time so the blocks crossfade together at
  // the shuffle duration rather than the single-block one.
  const [shuffling, setShuffling] = useState(false);
  const [openFor, setOpenFor] = useState<Slot | null>(null);

  // A base that cannot be rebuilt from the URL cannot be told apart from never
  // having picked one, so there is no error state to render (ADR 0011).
  if (!base) return <Navigate to="/" replace />;

  function move(slot: Slot, delta: 1 | -1) {
    if (!base) return;
    const pick = picks[slot];
    if (!pick) return;
    const next = advance(base, slot, pick.cursor ?? 0, delta);
    dispatch({ type: 'pickChanged', slot, hex: next.hex, cursor: next.cursor });
  }

  function shuffle() {
    if (!base) return;
    const fixed: Partial<Record<Slot, SlotPick>> = {};
    for (const slot of SLOTS) {
      const pick = picks[slot];
      if (pick && state.locked[slot]) fixed[slot] = pick;
    }

    const free = SLOTS.filter((slot) => slot !== base.slot && !state.locked[slot]);
    if (free.length === 0) {
      announce('Nothing to shuffle — every piece is kept.');
      return;
    }

    const next = composeOutfit(base, fixed, Math.random);
    dispatch({ type: 'picksReplaced', picks: next });
    setShuffling(true);
    // Cleared on a timer rather than a transitionend, which does not fire when
    // a colour happens to come back the same. Under reduced motion the CSS
    // duration is already zero, so a late clear changes nothing.
    setTimeout(() => setShuffling(false), 200);

    // Four blocks change and focus moves nowhere, so the live region is the
    // only thing that tells a screen reader anything. It names the colours
    // rather than saying "Shuffled", so an outfit that came back the same
    // reads as the same.
    announce(free.map((slot) => `${SLOT_LABELS[slot]} ${colorName(next[slot]!.hex)}`).join(', '));
  }

  const anyKept = SLOTS.some((slot) => state.locked[slot]);

  return (
    <Screen title="Goes with it">
      <div {...stylex.props(styles.blocks)}>
        {SLOTS.map((slot) => {
          const pick = picks[slot];
          if (slot === base.slot) {
            return (
              <ColorBlock
                key={slot}
                slot={slot}
                hex={base.hex}
                style={styles.base}
                fade={shuffling ? tokens.shuffle : tokens.colorFade}
              >
                <div {...stylex.props(fieldLayout.field)}>
                  <span {...stylex.props(blockText.slot)}>{SLOT_LABELS[slot]}</span>
                  <span {...stylex.props(blockText.name)}>{colorName(base.hex)}</span>
                </div>
              </ColorBlock>
            );
          }
          if (!pick) return null;
          const count = advance(base, slot, pick.cursor ?? 0, 0).count;
          return (
            <SuggestionBlock
              key={slot}
              slot={slot}
              hex={pick.hex}
              position={pick.cursor === undefined ? null : positionLabel(pick.cursor, count)}
              kept={state.locked[slot] === true}
              fade={shuffling ? tokens.shuffle : tokens.colorFade}
              onNext={() => move(slot, 1)}
              onPrevious={() => move(slot, -1)}
              onKeepToggle={() => dispatch({ type: 'lockToggled', slot })}
              onOpenAlternatives={() => setOpenFor(slot)}
            />
          );
        })}
      </div>
      <div {...stylex.props(styles.footer)}>
        <p {...stylex.props(styles.hint)}>
          {anyKept
            ? 'Kept pieces stay when you shuffle.'
            : 'Swipe a block, or hold one to keep it.'}
        </p>
        <button type="button" onClick={shuffle} {...stylex.props(styles.shuffle)}>
          <ShuffleIcon size={16} aria-hidden="true" />
          {anyKept ? 'Shuffle the rest' : 'Shuffle'}
        </button>
      </div>
      {openFor !== null && picks[openFor] && (
        <Sheet
          open
          onOpenChange={(next) => !next && setOpenFor(null)}
          title={`Other options for ${SLOT_LABELS[openFor]}`}
        >
          <Alternatives
            base={base}
            slot={openFor}
            current={picks[openFor].hex}
            onChoose={(hex, cursor) => {
              // The reducer drops a pickChanged for a locked slot, so a
              // deliberate choice on a kept block would silently do nothing.
              // Releasing first makes the choice land and makes the release
              // visible on the block.
              if (state.locked[openFor]) dispatch({ type: 'lockToggled', slot: openFor });
              dispatch({ type: 'pickChanged', slot: openFor, hex, cursor });
              setOpenFor(null);
            }}
          />
        </Sheet>
      )}
    </Screen>
  );
}
