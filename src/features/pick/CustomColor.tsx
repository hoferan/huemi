import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { hslToHex } from '../../color/convert';
import { colorName } from '../../color/palette';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { useSlotParam } from './useSlotParam';

const styles = stylex.create({
  preview: (background: string) => ({
    backgroundColor: background,
    borderRadius: tokens.radius,
    minHeight: '120px',
  }),
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  label: { color: tokens.ink2, fontSize: tokens.textBody, minWidth: '6rem' },
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
  const [hue, setHue] = useState(210);
  const [saturation, setSaturation] = useState(40);
  const [lightness, setLightness] = useState(50);

  const hex = hslToHex(hue, saturation, lightness);

  function commit() {
    dispatch({ type: 'baseChosen', slot, hex });
    void navigate('/suggest');
  }

  return (
    <Screen title="Mix your own">
      <div {...stylex.props(styles.preview(hex))} />
      <p data-testid="custom-name" {...stylex.props(styles.name)}>
        {colorName(hex)}
      </p>
      <div {...stylex.props(styles.row)}>
        <label htmlFor="hue" {...stylex.props(styles.label)}>
          Hue
        </label>
        <input
          id="hue"
          type="range"
          min={0}
          max={359}
          value={hue}
          onChange={(event) => setHue(Number(event.target.value))}
        />
      </div>
      <div {...stylex.props(styles.row)}>
        <label htmlFor="saturation" {...stylex.props(styles.label)}>
          Saturation
        </label>
        <input
          id="saturation"
          type="range"
          min={0}
          max={100}
          value={saturation}
          onChange={(event) => setSaturation(Number(event.target.value))}
        />
      </div>
      <div {...stylex.props(styles.row)}>
        <label htmlFor="lightness" {...stylex.props(styles.label)}>
          Lightness
        </label>
        <input
          id="lightness"
          type="range"
          min={0}
          max={100}
          value={lightness}
          onChange={(event) => setLightness(Number(event.target.value))}
        />
      </div>
      <Button label="Use this color" onClick={commit} />
    </Screen>
  );
}
