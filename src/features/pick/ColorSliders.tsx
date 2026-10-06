import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';

const styles = stylex.create({
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  label: { color: tokens.ink2, fontSize: tokens.textBody, minWidth: '6rem' },
  // The token, never a repeated literal, same as every other hit target
  // (A11Y.md). `flexGrow` so the track actually uses the row's width instead
  // of the browser's default handful of pixels.
  slider: { minHeight: tokens.touchTarget, flexGrow: 1 },
});

export type Hsl = { hue: number; saturation: number; lightness: number };

/**
 * Hue, saturation and lightness as three sliders. Every change reports the
 * whole color, so the caller holds one value instead of three.
 *
 * `idPrefix` goes in front of each slider's id (`hue`, `saturation`,
 * `lightness`) so that several sets can share a screen. The custom color
 * screen passes an empty prefix and keeps the ids it always had.
 */
export function ColorSliders({
  hsl,
  onChange,
  idPrefix,
}: {
  hsl: Hsl;
  onChange: (hsl: Hsl) => void;
  idPrefix: string;
}) {
  return (
    <>
      <SliderRow
        id={`${idPrefix}hue`}
        label="Hue"
        min={0}
        max={359}
        value={hsl.hue}
        onChange={(hue) => onChange({ ...hsl, hue })}
      />
      <SliderRow
        id={`${idPrefix}saturation`}
        label="Saturation"
        min={0}
        max={100}
        value={hsl.saturation}
        onChange={(saturation) => onChange({ ...hsl, saturation })}
      />
      <SliderRow
        id={`${idPrefix}lightness`}
        label="Lightness"
        min={0}
        max={100}
        value={hsl.lightness}
        onChange={(lightness) => onChange({ ...hsl, lightness })}
      />
    </>
  );
}

/**
 * The three sliders are otherwise identical apart from their range, so this
 * is one definition rather than three copies that could drift.
 */
function SliderRow({
  id,
  label,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div {...stylex.props(styles.row)}>
      <label htmlFor={id} {...stylex.props(styles.label)}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        {...stylex.props(styles.slider)}
      />
    </div>
  );
}
