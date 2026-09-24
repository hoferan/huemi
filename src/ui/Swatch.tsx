import type { Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../color/contrast';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { tokens } from '../styles/tokens.stylex';
import { selection } from './selection';
import { SR_ONLY } from './srOnly';

const styles = stylex.create({
  swatch: {
    // The button is the positioning context for the hidden name below: an
    // absolutely positioned descendant with no positioned ancestor lays out
    // against whatever ancestor happens to be one, or the initial containing
    // block if none is.
    position: 'relative',
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
export function Swatch({
  hex,
  onSelect,
  pressed,
  ref,
}: {
  hex: Hex;
  onSelect: (hex: Hex) => void;
  // Undefined rather than defaulted to false: `aria-pressed` marks a toggle
  // button, and most callers of this component are not one. Only the
  // correction panel's selection grid passes it.
  pressed?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(hex)}
      aria-pressed={pressed}
      {...stylex.props(
        styles.swatch,
        styles.fill(hex),
        needsBorder(hex) && styles.hairline,
        pressed && selection.outline,
      )}
    >
      <span style={SR_ONLY}>{colorName(hex)}</span>
    </button>
  );
}
