import * as stylex from '@stylexjs/stylex';

/**
 * The grid every group of `Swatch`es sits in: the picker, the outfit check's
 * palette sheet and the correction panel.
 *
 * A swatch prints its name, so a fixed column count would break "Burgundy"
 * across two lines at 200% text on a 320px screen, and the browser cannot be
 * relied on to hyphenate it. Each column is instead at least a 1/n share of
 * the row, which caps the grid at n columns, and at least 3.5rem, which is
 * wide enough for "Burgundy" at any text size and drops columns as the text
 * grows. The `16px` and `32px` are the 8px gap times the gaps in a row.
 *
 * Written out rather than built by a helper, because StyleX resolves these
 * values when it compiles.
 */
export const swatchGrid = stylex.create({
  three: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(max(3.5rem, calc((100% - 16px) / 3)), 1fr))',
    gap: '8px',
  },
  five: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(max(3.5rem, calc((100% - 32px) / 5)), 1fr))',
    gap: '8px',
  },
});
