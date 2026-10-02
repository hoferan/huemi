import type { Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../color/contrast';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { tokens } from '../styles/tokens.stylex';
import { selection } from './selection';

const styles = stylex.create({
  swatch: {
    display: 'flex',
    alignItems: 'flex-end',
    borderStyle: 'none',
    borderRadius: tokens.radius,
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    width: '100%',
    cursor: 'pointer',
    paddingBlock: '4px',
    paddingInline: '6px',
    font: 'inherit',
    fontSize: '0.75rem',
    lineHeight: 1.2,
    textAlign: 'start',
    // `swatchGrid` makes room for the longest palette name, and a described
    // colour such as "dark muted blue" can be longer. A word that still does
    // not fit breaks at a syllable where the browser hyphenates, against
    // `lang="en"` on the document, and anywhere where it does not, so the
    // name never spills out of its colour.
    hyphens: 'auto',
    overflowWrap: 'anywhere',
  },
  // Dynamic: the colour is a runtime value, which is the whole reason this
  // project chose StyleX. See ADR 0002. The text takes the foreground
  // `readableForeground` chose, at full opacity (A11Y.md).
  fill: (background: string, foreground: string) => ({
    backgroundColor: background,
    color: foreground,
  }),
  // A contrast affordance, not decoration: without it White, Cream and Light
  // grey have no edge against the #d8d5cf background. An inset shadow rather
  // than a border, so the hairline costs the colour area no width.
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
});

/**
 * One colour, as a button, with its name printed on it.
 *
 * The name comes from `colorName`, which stops claiming a palette word past
 * `NAME_MAX_DISTANCE` and describes the colour instead. That matters here more
 * than anywhere: the name is the only channel a colour-vision-deficient user
 * has, and a confident wrong name reads as information. It is printed rather
 * than kept for screen readers for the same reason, since Forest, Olive and
 * Khaki can look alike to someone who still reads the screen.
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
        styles.fill(hex, readableForeground(hex).color),
        needsBorder(hex) && styles.hairline,
        pressed && selection.outline,
      )}
    >
      <span>{colorName(hex)}</span>
    </button>
  );
}
