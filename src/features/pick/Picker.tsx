import { Link } from 'react-router';
import { Redirect } from '../../ui/Redirect';
import * as stylex from '@stylexjs/stylex';
import { PALETTE } from '../../color/palette';
import type { Slot } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { Screen } from '../../ui/Screen';
import { PICKER_TITLE, SLOT_TITLE } from './copy';
import { Swatch } from '../../ui/Swatch';
import { swatchGrid } from '../../ui/swatchGrid';
import { useChooseBase } from './useChooseBase';
import { clearOfToasts } from '../../ui/toastClearance';
import { useSlotParam } from './useSlotParam';

const styles = stylex.create({
  // The swatches share the height the screen has, down to "Mix your own", so
  // a phone shows them about twice the touch target. A basis of 0 and rows of
  // `minmax(target, 1fr)` together: the grid's minimum is then every row at
  // the target, so it grows into exactly the height that is left, and a short
  // screen or text at 200% keeps rows at the target and scrolls. A `1fr` cannot
  // be capped without raising that minimum, so a window tall enough for 112px
  // rows to fit switches to them and leaves the rest below.
  fill: {
    flex: '1 1 0',
    gridAutoRows: {
      default: `minmax(${tokens.touchTarget}, 1fr)`,
      '@media (min-height: 1080px)': `minmax(${tokens.touchTarget}, 112px)`,
    },
  },
  // A link is a hit target the same as a button (A11Y.md), so it carries the
  // same token. `inline-flex` rather than the anchor's default `inline` lets
  // `minHeight` take effect at all, and centres the text inside that height
  // instead of leaving it sitting in a band of dead space below the words.
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

/**
 * The palette leads, and free selection is a link rather than a mode.
 *
 * The two are not equals in this app's terms: `suggest()` only ever returns
 * palette colours, and `colorName` only names confidently near the palette.
 * Keeping the spectrum on its own route also keeps it off this screen, and a
 * full-width hue slider under these swatches is exactly the saturated
 * decoration the brief says shifts how surrounding colour is judged.
 *
 * A tap commits. The choice is reversible with back, and the brief says
 * rejecting a colour and seeing another is the app's main interaction, so a
 * confirm step would tax every pass through the flow.
 */
export function Picker() {
  const slot = useSlotParam();
  if (!slot) return <Redirect to="/slot" />;
  return <PickerForSlot slot={slot} />;
}

/**
 * Split out of `Picker` because the early return above narrows `slot` for
 * the rest of that function's body, but not inside a closure declared later
 * in it: `choose` would still see `Slot | null` there on this TypeScript
 * version. Taking `slot: Slot` as a prop narrows by construction instead of
 * by a runtime check repeated here that could never fail.
 */
function PickerForSlot({ slot }: { slot: Slot }) {
  const choose = useChooseBase(slot);

  return (
    <Screen title={PICKER_TITLE} back={{ to: '/slot', title: SLOT_TITLE }}>
      <div {...stylex.props(swatchGrid.three, styles.fill)}>
        {PALETTE.map((color) => (
          <Swatch key={color.hex} hex={color.hex} onSelect={choose} clearOfToasts />
        ))}
      </div>
      <Link to={`/color/custom?slot=${slot}`} {...clearOfToasts} {...stylex.props(styles.link)}>
        Mix your own
      </Link>
    </Screen>
  );
}
