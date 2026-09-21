import type { ReactElement, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../color/contrast';
import { blockLabel } from '../color/palette';
import type { Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { tokens } from '../styles/tokens.stylex';

const styles = stylex.create({
  block: {
    position: 'relative',
    display: 'flex',
    // Shares the screen with its siblings, but never shrinks below what a hit
    // target needs. 44px is the floor the controls impose; the block's own
    // text produces more than that in practice, and that surplus is emergent
    // rather than designed, which is why there is no literal here.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minHeight: tokens.touchTarget,
    borderRadius: tokens.radius,
    overflow: 'hidden',
    // The page scrolls vertically while the block reads horizontal drags.
    // Without this the browser claims the gesture before the handler sees it.
    touchAction: 'pan-y',
    transitionProperty: 'background-color',
    transitionDuration: tokens.colorFade,
  },
  // Dynamic: the colour is a runtime value, which is why this project chose
  // StyleX. See ADR 0002. The foreground travels with it so that everything
  // inside can reach it as `currentColor`.
  fill: (background: string, foreground: string) => ({
    backgroundColor: background,
    color: foreground,
  }),
  // A contrast affordance, not decoration: without it White, Cream and Light
  // grey have no edge against the #d8d5cf background. Inset, so the hairline
  // costs the colour area no width.
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
});

/**
 * One slot's colour, as a labelled group.
 *
 * The group's name is `blockLabel`, which pairs the slot with `colorName` —
 * the function M1 built for exactly this and nothing called until now. It
 * matters more here than on a swatch: a swatch belongs to no slot, so it can
 * name a colour alone, while five of these sit on one screen and "Pale blue"
 * on its own says nothing about which garment it is.
 *
 * The foreground comes from `readableForeground`, which compares both
 * candidates rather than thresholding luminance. Everything inside inherits
 * it through `currentColor`, so a control that draws itself from
 * `currentColor` is legible on any block without knowing which colour it is
 * sitting on.
 */
export function ColorBlock({
  slot,
  hex,
  children,
}: {
  slot: Slot;
  hex: Hex;
  children: ReactNode;
}): ReactElement {
  const foreground = readableForeground(hex);
  return (
    <div
      role="group"
      aria-label={blockLabel(slot, hex)}
      {...stylex.props(
        styles.block,
        styles.fill(hex, foreground.color),
        needsBorder(hex) && styles.hairline,
      )}
    >
      {children}
    </div>
  );
}
