import * as stylex from '@stylexjs/stylex';
import { Trash2 } from 'lucide-react';
import { needsBorder } from '../../color/contrast';
import { colorName } from '../../color/palette';
import { SLOTS, SLOT_LABELS, type Outfit } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { formatSavedDate } from './formatSavedDate';

const styles = stylex.create({
  card: {
    // The open button fills the card and Delete sits over its lower right
    // corner. They overlap on the grid, not in the DOM, so neither button is
    // inside the other.
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gridTemplateRows: '1fr auto',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
  },
  open: {
    gridColumn: '1 / 3',
    gridRow: '1 / 3',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px',
    // Room on the right of the name row for Delete.
    paddingInlineEnd: '10px',
    borderStyle: 'none',
    borderRadius: tokens.radius,
    backgroundColor: { default: 'transparent', ':hover': tokens.surface },
    color: tokens.ink,
    font: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
  },
  strip: { display: 'flex', gap: '6px', height: '72px' },
  piece: { flexGrow: 1, flexBasis: 0, borderRadius: tokens.radiusMedia },
  fill: (background: string) => ({ backgroundColor: background }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: '8px',
    minHeight: tokens.touchTarget,
    // Delete's width, so a long name wraps before it reaches the button.
    paddingInlineEnd: '112px',
  },
  name: { fontSize: '1.05rem', fontWeight: 500 },
  date: { fontSize: '0.8rem', color: tokens.ink2 },
  remove: {
    gridColumn: '2',
    gridRow: '2',
    alignSelf: 'end',
    margin: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: tokens.touchTarget,
    paddingInline: '14px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: '999px',
    backgroundColor: { default: tokens.bg, ':hover': tokens.surface },
    color: tokens.ink,
    font: 'inherit',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
});

/**
 * One saved outfit: its colours as a strip, its name and its date, and a
 * Delete button beside the button that opens it.
 *
 * The open button is named by the outfit's name alone. The date and the
 * pieces are its description, read after the name, because the strip says
 * nothing to someone who cannot see it or cannot tell its colours apart.
 */
export function SavedCard({
  outfit,
  now,
  onOpen,
  onDelete,
}: {
  outfit: Outfit;
  now: Date;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const date = formatSavedDate(outfit.createdAt, now);
  const pieces = SLOTS.flatMap((slot) => {
    const hex = outfit.pieces[slot];
    return hex ? [`${colorName(hex)} ${SLOT_LABELS[slot].toLowerCase()}`] : [];
  }).join(', ');
  const details = `outfit-${outfit.id}-details`;

  return (
    <li {...stylex.props(styles.card)}>
      <button
        type="button"
        id={`outfit-${outfit.id}`}
        aria-describedby={details}
        onClick={onOpen}
        {...stylex.props(styles.open)}
      >
        <span aria-hidden="true" {...stylex.props(styles.strip)}>
          {SLOTS.map((slot) => {
            const hex = outfit.pieces[slot];
            return hex ? (
              <span
                key={slot}
                {...stylex.props(
                  styles.piece,
                  styles.fill(hex),
                  needsBorder(hex) && styles.hairline,
                )}
              />
            ) : null;
          })}
        </span>
        <span {...stylex.props(styles.meta)}>
          <span {...stylex.props(styles.name)}>{outfit.name}</span>
          <span aria-hidden="true" {...stylex.props(styles.date)}>
            {date}
          </span>
        </span>
      </button>
      {/* `hidden` rather than a visually-hidden style: `aria-describedby`
          reads a referenced node's text even when the node itself renders
          nothing, so there is no need to keep it in the layout at all, and
          nothing here can widen the page the way a positioned, unwrapped
          span could. */}
      <span id={details} hidden>
        {`${date}. ${pieces}`}
      </span>
      <button
        type="button"
        aria-label={`Delete ${outfit.name}`}
        onClick={onDelete}
        {...stylex.props(styles.remove)}
      >
        <Trash2 size={16} aria-hidden="true" />
        Delete
      </button>
    </li>
  );
}
