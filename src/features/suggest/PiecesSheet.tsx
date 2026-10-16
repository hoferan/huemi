import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';
import { Switch } from 'radix-ui';
import { dressFixedBy, isOptional, type OptionalSlot, type Shape } from '../../model/shape';
import { SLOT_LABELS, type Slot } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { Sheet } from '../../ui/Sheet';
import { BodyChoice } from './BodyChoice';
import { ALWAYS, BASE_FIXES, PIECES, REMEMBERED, TOP_AND_BOTTOM } from './copy';

const styles = stylex.create({
  list: { listStyle: 'none', margin: 0, padding: 0 },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    minHeight: tokens.touchTarget,
    paddingBlock: '6px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.line,
  },
  label: { flexGrow: 1, fontSize: '1rem', color: tokens.ink, cursor: 'pointer' },
  fixed: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  always: { fontSize: '0.875rem', color: tokens.ink2 },
  note: { margin: 0, marginTop: '12px', fontSize: '0.875rem', color: tokens.ink2 },
  // The 44px check measures switches (e2e/hitTargets.ts), so the root is the
  // full target and the track inside it is only what is drawn.
  switch: {
    position: 'relative',
    flexShrink: 0,
    width: '56px',
    height: tokens.touchTarget,
    padding: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outlineColor: tokens.ink,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: '2px',
    outlineOffset: '2px',
    borderRadius: '999px',
  },
  track: {
    position: 'absolute',
    insetInline: '2px',
    top: '8px',
    height: '28px',
    borderRadius: '999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    // ink2 rather than the hairline, because a switched-off switch is only its
    // edge and its thumb, and both need 3:1 to stay findable (WCAG 1.4.11).
    borderColor: tokens.ink2,
  },
  trackOn: { backgroundColor: tokens.ink },
  trackOff: { backgroundColor: tokens.surface },
  thumb: {
    position: 'absolute',
    top: '11px',
    left: '5px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    transitionProperty: 'transform',
    transitionDuration: tokens.colorFade,
  },
  thumbOn: { transform: 'translateX(24px)', backgroundColor: tokens.darkFg },
  thumbOff: { backgroundColor: tokens.ink2 },
});

/** The rows, head to toe. `body` is the top and the bottom, or the dress. */
const ROWS: readonly (Slot | 'body')[] = ['outerwear', 'body', 'shoes', 'accessory'];

/**
 * The pieces the outfit on screen wears. A piece that can be left out gets a
 * switch named by its own label. A piece that cannot, shoes always and the
 * base's own slot, says so in words and gets no control at all: a disabled
 * switch would sit there asking for something that cannot happen (A11Y.md).
 *
 * Where the top and the bottom sit, two radios choose between them and a
 * dress (#136). A top, a bottom or a dress as the base settles that choice,
 * and the row then says which, and why, as a base's own row does.
 */
export function PiecesSheet({
  open,
  onOpenChange,
  shape,
  baseSlot,
  onWornChange,
  onDressChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shape: Shape;
  baseSlot: Slot;
  onWornChange: (slot: OptionalSlot, worn: boolean) => void;
  onDressChange: (dress: boolean) => void;
}) {
  const id = useId();
  const fixedDress = dressFixedBy(baseSlot);

  function fixedRow(key: string, label: string, why: string | null) {
    return (
      <li key={key} {...stylex.props(styles.row)}>
        <span {...stylex.props(styles.label)}>{label}</span>
        <span {...stylex.props(styles.fixed)}>
          <span {...stylex.props(styles.always)}>{ALWAYS}</span>
          {why !== null && <span {...stylex.props(styles.always)}>{why}</span>}
        </span>
      </li>
    );
  }

  function bodyRow() {
    // Only a top, a bottom or a dress fixes the choice, so `baseSlot` is one
    // of the three whenever `fixedDress` is not null.
    if (fixedDress !== null) {
      const label = fixedDress ? SLOT_LABELS.dress : TOP_AND_BOTTOM;
      return fixedRow('body', label, BASE_FIXES[baseSlot as 'top' | 'bottom' | 'dress']);
    }
    return (
      <li key="body">
        <BodyChoice dress={shape.dress} onChange={onDressChange} />
      </li>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={PIECES}>
      <ul {...stylex.props(styles.list)}>
        {ROWS.map((slot) => {
          if (slot === 'body') return bodyRow();
          const label = SLOT_LABELS[slot];
          if (!isOptional(slot) || slot === baseSlot) {
            return fixedRow(slot, label, isOptional(slot) ? BASE_FIXES[slot] : null);
          }
          const worn = shape[slot];
          return (
            <li key={slot} {...stylex.props(styles.row)}>
              <label htmlFor={`${id}-${slot}`} {...stylex.props(styles.label)}>
                {label}
              </label>
              <Switch.Root
                id={`${id}-${slot}`}
                checked={worn}
                onCheckedChange={(next) => onWornChange(slot, next)}
                {...stylex.props(styles.switch)}
              >
                <span
                  aria-hidden="true"
                  {...stylex.props(styles.track, worn ? styles.trackOn : styles.trackOff)}
                />
                <Switch.Thumb
                  {...stylex.props(styles.thumb, worn ? styles.thumbOn : styles.thumbOff)}
                />
              </Switch.Root>
            </li>
          );
        })}
      </ul>
      <p {...stylex.props(styles.note)}>{REMEMBERED}</p>
    </Sheet>
  );
}
