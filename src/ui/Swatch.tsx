import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../color/contrast';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { tokens } from '../styles/tokens.stylex';

const styles = stylex.create({
  swatch: {
    borderStyle: 'none',
    borderRadius: tokens.radius,
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    width: '100%',
    cursor: 'pointer',
    padding: 0,
  },
  // Dynamic: the colour is a runtime value, which is the whole reason this
  // project chose StyleX. See ADR 0002.
  fill: (background: string) => ({ backgroundColor: background }),
  // A contrast affordance, not decoration: without it White, Cream and Light
  // grey have no edge against the #d8d5cf background. An inset shadow rather
  // than a border, so the hairline costs the colour area no width.
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
});

/**
 * One colour, as a button.
 *
 * The accessible name comes from `colorName`, which stops claiming a palette
 * word past `NAME_MAX_DISTANCE` and describes the colour instead. That matters
 * here more than anywhere: the name is the only channel a colour-vision-
 * deficient user has, and a confident wrong name reads as information.
 */
export function Swatch({ hex, onSelect }: { hex: Hex; onSelect: (hex: Hex) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hex)}
      {...stylex.props(styles.swatch, styles.fill(hex), needsBorder(hex) && styles.hairline)}
    >
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {colorName(hex)}
      </span>
    </button>
  );
}
