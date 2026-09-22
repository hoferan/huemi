import { useEffect, useMemo } from 'react';
import { Navigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { colorName } from '../../color/palette';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';
import { advance, composeOutfit, positionLabel } from '../../session/select';
import { useSession } from '../../session/useSession';
import { blockText, fieldLayout } from '../../ui/blockText';
import { ColorBlock } from '../../ui/ColorBlock';
import { Screen } from '../../ui/Screen';
import { SuggestionBlock } from '../../ui/SuggestionBlock';
import { useBaseParam } from './useBaseParam';

const styles = stylex.create({
  blocks: { display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 },
  // The base is the ground every suggestion is made against, so it reads
  // larger. The proportion is the prototype's.
  base: { flexGrow: 1.6 },
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

  return (
    <Screen title="Goes with it">
      <div {...stylex.props(styles.blocks)}>
        {SLOTS.map((slot) => {
          const pick = picks[slot];
          if (slot === base.slot) {
            return (
              <ColorBlock key={slot} slot={slot} hex={base.hex} style={styles.base}>
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
              onNext={() => move(slot, 1)}
              onPrevious={() => move(slot, -1)}
              onKeepToggle={() => dispatch({ type: 'lockToggled', slot })}
              onOpenAlternatives={() => undefined}
            />
          );
        })}
      </div>
    </Screen>
  );
}
