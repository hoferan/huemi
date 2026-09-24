import { useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { withLightness } from '../../color/oklab';
import { colorName, nearbyColors } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { tokens } from '../../styles/tokens.stylex';
import { SheetHandle } from '../../ui/SheetHandle';
import { Swatch } from '../../ui/Swatch';
import { useDragDismiss } from '../../ui/useDragDismiss';
import { CLOSER, LIGHTER_DARKER, NOT_QUITE } from './copy';

const styles = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transitionProperty: 'transform',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  // Dynamic: the offset is a runtime value from the drag, same shape as
  // `Sheet`'s own `drag` style. See that file's comment for why the
  // transition is off while a finger is down.
  drag: (offset: number) => ({
    transform: `translateY(${offset}px)`,
    transitionDuration: offset === 0 ? tokens.sheet : '0ms',
  }),
  group: { display: 'flex', flexDirection: 'column', gap: '8px' },
  caption: { margin: 0, fontSize: '0.875rem', color: tokens.ink2 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' },
  sliderRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
  slider: { minHeight: tokens.touchTarget, width: '100%' },
});

/**
 * The panel behind "Not quite": a swatch grid and a lightness slider to
 * correct what the camera read.
 *
 * Variant D. Opened by "Not quite", it sits in the layout below the photo
 * and pushes it up rather than covering it, because the user is comparing
 * the two. André chose this on 2026-09-24 over an always-visible panel, an
 * inline reveal, a modal sheet over the photo, and a sheet over the buttons
 * alone. It is a disclosure and not the modal `Sheet`: nothing here should
 * trap focus, and the photo must stay in view.
 */
export function CorrectionPanel({
  id,
  reading,
  selected,
  shift,
  onSelect,
  onShift,
  onClose,
}: {
  id: string;
  reading: Hex;
  selected: Hex;
  shift: number;
  onSelect: (hex: Hex) => void;
  onShift: (delta: number) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const { offset, onPointerDown, dragged } = useDragDismiss({
    onDismiss: onClose,
    height: () => panel.current?.offsetHeight ?? 0,
  });

  // A neighbour named like the reading is left out. Two swatches with one name
  // are ambiguous to a screen reader, and choosing it would show "Your
  // correction: Navy" after "We read Navy", which reads as no change. Asking
  // for five and keeping four still leaves five swatches in the grid.
  const readName = colorName(reading);
  const choices = [
    reading,
    ...nearbyColors(reading, 5)
      .filter((color) => color.name !== readName)
      .slice(0, 4)
      .map((color) => color.hex),
  ];

  return (
    <section
      ref={panel}
      id={id}
      aria-label={NOT_QUITE}
      {...stylex.props(styles.panel, styles.drag(offset))}
    >
      <SheetHandle
        label="Close"
        onClose={onClose}
        onPointerDown={onPointerDown}
        dragged={dragged}
      />
      <div role="group" aria-label={CLOSER} {...stylex.props(styles.group)}>
        <p {...stylex.props(styles.caption)}>{CLOSER}</p>
        <div {...stylex.props(styles.grid)}>
          {choices.map((hex) => (
            <Swatch key={hex} hex={hex} onSelect={onSelect} pressed={hex === selected} />
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.sliderRow)}>
        <label htmlFor={`${id}-lightness`}>{LIGHTER_DARKER}</label>
        <input
          id={`${id}-lightness`}
          type="range"
          min={-0.15}
          max={0.15}
          step={0.01}
          value={shift}
          aria-valuetext={colorName(withLightness(selected, shift))}
          onChange={(event) => onShift(Number(event.target.value))}
          {...stylex.props(styles.slider)}
        />
      </div>
    </section>
  );
}
