import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../../color/contrast';
import type { Hex } from '../../model/hex';
import type { Suggestion } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';

const styles = stylex.create({
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  option: {
    minHeight: '88px',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '12px',
    borderRadius: tokens.radius,
    borderStyle: 'none',
    font: 'inherit',
    fontSize: '0.875rem',
    cursor: 'pointer',
    outlineColor: 'currentColor',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: '3px',
    outlineOffset: '-3px',
  },
  fill: (background: string, foreground: string) => ({
    backgroundColor: background,
    color: foreground,
  }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  // The one showing, marked with a ring rather than a tick: a tick would need
  // a colour of its own on top of an arbitrary garment colour, and
  // currentColor is already the pair readableForeground chose.
  current: { boxShadow: `inset 0 0 0 3px currentColor` },
});

export type LeadTile = { hex: Hex; label: string; current: boolean; onChoose: () => void };

/**
 * Colours for one slot, best first, as a grid of tiles.
 *
 * The caller ranks the list: the suggestions screen passes `suggest()` against
 * its base, the check result passes `alternativesFor()` against the rest of
 * the outfit. Each tile's name carries its position in `options`, so a caller
 * showing a position label elsewhere must pass the list that label counts.
 *
 * `lead` is a tile before the list and outside its count: the check result's
 * "Yours", which offers back what is actually worn even when no palette entry
 * matches it.
 *
 * Deliberately not filtered by the composer's chroma budget. On the
 * suggestions screen the block's Next button walks this same list, and its
 * position label says "3 of 18" against its length, so a sheet showing fewer
 * entries would make that label false. Choosing a colour that takes the
 * outfit over budget is the user's call; the composer only decides what to
 * offer first.
 */
export function Alternatives({
  options,
  current,
  onChoose,
  lead,
}: {
  options: readonly Suggestion[];
  current: Hex | null;
  onChoose: (hex: Hex, cursor: number) => void;
  lead?: LeadTile;
}) {
  const tile = (hex: Hex, showing: boolean) =>
    stylex.props(
      styles.option,
      styles.fill(hex, readableForeground(hex).color),
      needsBorder(hex) && styles.hairline,
      showing && styles.current,
    );
  return (
    <div {...stylex.props(styles.grid)}>
      {lead && (
        <button
          type="button"
          aria-current={lead.current ? 'true' : undefined}
          onClick={lead.onChoose}
          {...tile(lead.hex, lead.current)}
        >
          {lead.label}
        </button>
      )}
      {options.map((entry, cursor) => {
        const showing = entry.hex === current;
        return (
          <button
            key={entry.hex}
            type="button"
            aria-label={`${entry.name}, ${cursor + 1} of ${options.length}`}
            aria-current={showing ? 'true' : undefined}
            onClick={() => onChoose(entry.hex, cursor)}
            {...tile(entry.hex, showing)}
          >
            {entry.name}
          </button>
        );
      })}
    </div>
  );
}
