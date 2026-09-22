import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../../color/contrast';
import { suggest } from '../../color/engine';
import type { Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import type { Base } from '../../session/types';
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

/**
 * Every colour the engine ranks for one slot.
 *
 * Deliberately not filtered by the composer's chroma budget. The block's Next
 * button walks this same list, and its position label says "3 of 18" against
 * its length, so a sheet showing fewer entries would make that label false.
 * Choosing a colour that takes the outfit over budget is the user's call; the
 * composer only decides what to offer first.
 */
export function Alternatives({
  base,
  slot,
  current,
  onChoose,
}: {
  base: Base;
  slot: Slot;
  current: Hex;
  onChoose: (hex: Hex, cursor: number) => void;
}) {
  const list = suggest(base.hex, slot, base.slot);
  return (
    <div {...stylex.props(styles.grid)}>
      {list.map((entry, cursor) => {
        const foreground = readableForeground(entry.hex);
        const showing = entry.hex === current;
        return (
          <button
            key={entry.hex}
            type="button"
            aria-label={`${entry.name}, ${cursor + 1} of ${list.length}`}
            aria-current={showing ? 'true' : undefined}
            onClick={() => onChoose(entry.hex, cursor)}
            {...stylex.props(
              styles.option,
              styles.fill(entry.hex, foreground.color),
              needsBorder(entry.hex) && styles.hairline,
              showing && styles.current,
            )}
          >
            {entry.name}
          </button>
        );
      })}
    </div>
  );
}
