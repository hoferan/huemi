import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

/**
 * The outline that shows which color in a group is selected. `aria-pressed`
 * tells a screen reader, and this tells everyone else, where a change of
 * border against a neighbouring color could be missed by a user with a
 * color-vision deficiency (WCAG 1.4.1). It is drawn in ink, outside the
 * color, so it contrasts with the page background whatever the color is.
 *
 * Shared by `Swatch` and the confirm screen's color choices, so the two groups
 * mark a selection the same way.
 *
 * An author outline replaces the browser's focus ring, so a selected control
 * that also has keyboard focus would look the same as one that does not.
 * Switching to dashed under `:focus-visible` keeps the two apart without
 * changing the outline's width or color.
 */
export const selection = stylex.create({
  outline: {
    outlineColor: tokens.ink,
    outlineStyle: { default: 'solid', ':focus-visible': 'dashed' },
    outlineWidth: '3px',
    outlineOffset: '2px',
  },
});
