import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { hslToHex } from '../../color/convert';
import { colorName } from '../../color/palette';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { useAnnounce } from '../../ui/useAnnounce';
import { useSlotParam } from './useSlotParam';

const styles = stylex.create({
  preview: (background: string) => ({
    backgroundColor: background,
    borderRadius: tokens.radius,
    minHeight: '120px',
  }),
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  label: { color: tokens.ink2, fontSize: tokens.textBody, minWidth: '6rem' },
  // The token, never a repeated literal, same as every other hit target
  // (A11Y.md). `flexGrow` so the track actually uses the row's width instead
  // of the browser's default handful of pixels.
  slider: { minHeight: tokens.touchTarget, flexGrow: 1 },
  name: { color: tokens.ink, fontSize: tokens.textBody, margin: 0 },
});

/**
 * Free selection, on its own route so the spectrum never shares a screen with
 * the palette it would bias.
 *
 * A commit button rather than committing on drag: a slider has no moment that
 * means "this one", and dispatching on every pixel of movement would fill the
 * session with colours nobody chose.
 *
 * The name is on screen and updates with the sliders, because a colour arrived
 * at by dragging is otherwise available only to someone who can see it.
 */
export function CustomColor() {
  const slot = useSlotParam();
  if (!slot) return <Navigate to="/slot" replace />;
  return <CustomColorForSlot slot={slot} />;
}

/**
 * Split out of `CustomColor` for the same reason `Picker` splits into
 * `PickerForSlot`: TypeScript 6.0.3 does not narrow a `const` through the
 * early return above into a closure declared later in the same function
 * body. Taking `slot` as a prop narrows it by construction instead.
 */
function CustomColorForSlot({ slot }: { slot: Slot }) {
  const { dispatch } = useSession();
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [hue, setHue] = useState(210);
  const [saturation, setSaturation] = useState(40);
  const [lightness, setLightness] = useState(50);

  const hex = hslToHex(hue, saturation, lightness);
  const name = colorName(hex);

  // Fires on mount and again whenever `name` itself differs from the value
  // this effect last ran with, which is exactly "the name changed": React
  // skips an effect whose dependencies are unchanged, so no ref is needed to
  // remember the last announcement. Depending on `hex` instead would
  // announce on every pixel of drag, which is the failure mode this guards
  // against — a slider between two named colours can cross dozens of hex
  // values that all read the same word aloud.
  useEffect(() => {
    announce(name);
  }, [name, announce]);

  function commit() {
    dispatch({ type: 'baseChosen', slot, hex });
    void navigate('/suggest');
  }

  return (
    <Screen title="Mix your own">
      <div {...stylex.props(styles.preview(hex))} />
      <p data-testid="custom-name" {...stylex.props(styles.name)}>
        {name}
      </p>
      <SliderRow id="hue" label="Hue" min={0} max={359} value={hue} onChange={setHue} />
      <SliderRow
        id="saturation"
        label="Saturation"
        min={0}
        max={100}
        value={saturation}
        onChange={setSaturation}
      />
      <SliderRow
        id="lightness"
        label="Lightness"
        min={0}
        max={100}
        value={lightness}
        onChange={setLightness}
      />
      <Button label="Use this color" onClick={commit} />
    </Screen>
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
