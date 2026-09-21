import { Link, Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { PALETTE } from '../../color/palette';
import type { Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { Screen } from '../../ui/Screen';
import { Swatch } from '../../ui/Swatch';
import { useSlotParam } from './useSlotParam';

const styles = stylex.create({
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
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
  if (!slot) return <Navigate to="/slot" replace />;
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
  const { dispatch } = useSession();
  const navigate = useNavigate();

  function choose(hex: Hex) {
    dispatch({ type: 'baseChosen', slot, hex });
    void navigate('/suggest');
  }

  return (
    <Screen title="Pick a color">
      <div {...stylex.props(styles.grid)}>
        {PALETTE.map((color) => (
          <Swatch key={color.hex} hex={color.hex} onSelect={choose} />
        ))}
      </div>
      <Link to={`/color/custom?slot=${slot}`} {...stylex.props(styles.link)}>
        Mix your own
      </Link>
    </Screen>
  );
}
