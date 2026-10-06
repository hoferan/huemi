import { Redirect } from '../../ui/Redirect';
import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { hslToHex } from '../../color/convert';
import { colorName } from '../../color/palette';
import type { Slot } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { ColorSliders, type Hsl } from './ColorSliders';
import { PICKER_TITLE } from './copy';
import { useAnnounce } from '../../ui/useAnnounce';
import { useChooseBase } from './useChooseBase';
import { useSlotParam } from './useSlotParam';

const styles = stylex.create({
  preview: (background: string) => ({
    backgroundColor: background,
    borderRadius: tokens.radius,
    minHeight: '120px',
  }),
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
  if (!slot) return <Redirect to="/slot" />;
  return <CustomColorForSlot slot={slot} />;
}

/**
 * Split out of `CustomColor` for the same reason `Picker` splits into
 * `PickerForSlot`: TypeScript 6.0.3 does not narrow a `const` through the
 * early return above into a closure declared later in the same function
 * body. Taking `slot` as a prop narrows it by construction instead.
 */
function CustomColorForSlot({ slot }: { slot: Slot }) {
  const chooseBase = useChooseBase(slot);
  const announce = useAnnounce();
  const [hsl, setHsl] = useState<Hsl>({ hue: 210, saturation: 40, lightness: 50 });

  const hex = hslToHex(hsl.hue, hsl.saturation, hsl.lightness);
  const name = colorName(hex);

  // Fires again whenever `name` itself differs from the value this effect
  // last ran with, which is exactly "the name changed": React skips an
  // effect whose dependencies are unchanged, so no extra bookkeeping is
  // needed to remember the last announcement. Depending on `hex` instead
  // would announce on every pixel of drag, which is the failure mode this
  // guards against — a slider between two named colours can cross dozens of
  // hex values that all read the same word aloud.
  //
  // Skipped on mount: A11Y.md scopes this live region to changes with no
  // focus move, and arriving at this screen has one, to the heading (see
  // `Screen`). Announcing the default colour's name at the same moment would
  // speak it twice through two different channels.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    announce(name);
  }, [name, announce]);

  return (
    <Screen title="Mix your own" back={{ to: `/color?slot=${slot}`, title: PICKER_TITLE }}>
      <div {...stylex.props(styles.preview(hex))} />
      <p data-testid="custom-name" {...stylex.props(styles.name)}>
        {name}
      </p>
      <ColorSliders hsl={hsl} onChange={setHsl} idPrefix="" />
      <Button label="Use this color" onClick={() => chooseBase(hex)} />
    </Screen>
  );
}
