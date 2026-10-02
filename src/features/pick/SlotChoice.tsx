import { useNavigate, useSearchParams } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { HOME } from '../../ui/home';
import { Screen } from '../../ui/Screen';
import { clearOfToasts } from '../../ui/toastClearance';
import { SLOT_TITLE } from './copy';

const styles = stylex.create({
  // The five rows share the screen's height the way the picker's swatches do,
  // and for the reasons its grid gives. Past 144px, on a window tall enough
  // for that, a row stops growing rather than turning into a slab.
  list: {
    flex: '1 1 0',
    display: 'grid',
    gridAutoRows: {
      default: `minmax(${tokens.touchTarget}, 1fr)`,
      '@media (min-height: 1000px)': `minmax(${tokens.touchTarget}, 144px)`,
    },
    gap: '8px',
  },
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
 * One column: five rows that each take a share of the screen are larger
 * targets than a grid of five could give.
 */
export function SlotChoice() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Checked against the one value it can take, not interpolated: the URL is
  // user input, and anything unknown keeps the route that always works.
  const next = params.get('next') === 'camera' ? '/camera' : '/color';

  function choose(slot: Slot) {
    void navigate(`${next}?slot=${slot}`);
  }

  return (
    <Screen title={SLOT_TITLE} back={HOME}>
      <div {...stylex.props(styles.list)}>
        {SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => choose(slot)}
            {...clearOfToasts}
            {...stylex.props(styles.slot)}
          >
            {SLOT_LABELS[slot]}
          </button>
        ))}
      </div>
    </Screen>
  );
}
