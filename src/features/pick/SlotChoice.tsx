import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { Screen } from '../../ui/Screen';

const styles = stylex.create({
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  slot: {
    backgroundColor: tokens.surface,
    color: tokens.ink,
    borderStyle: 'none',
    borderRadius: tokens.radius,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
    minHeight: tokens.touchTarget,
    paddingBlock: '12px',
    paddingInline: '16px',
    textAlign: 'start',
    cursor: 'pointer',
  },
});

/**
 * Five rows, from `SLOTS` rather than a list written here, so the screen
 * cannot drift from the model the engine weights by area.
 *
 * A list and not a grid: five items each need a 44px target, and a grid would
 * only make them smaller to save space this screen does not need.
 */
export function SlotChoice() {
  const navigate = useNavigate();

  function choose(slot: Slot) {
    void navigate(`/color?slot=${slot}`);
  }

  return (
    <Screen title="Choose a garment">
      <div {...stylex.props(styles.list)}>
        {SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => choose(slot)}
            {...stylex.props(styles.slot)}
          >
            {SLOT_LABELS[slot]}
          </button>
        ))}
      </div>
    </Screen>
  );
}
