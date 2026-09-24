import { startTransition, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../../color/contrast';
import { withLightness } from '../../color/oklab';
import { blockLabel, colorName } from '../../color/palette';
import { readColor, type ColorReading } from '../../color/read';
import type { Pixels } from '../../model/frame';
import type { Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { blockText } from '../../ui/blockText';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { useSlotParam } from '../pick/useSlotParam';
import { CorrectionPanel } from './CorrectionPanel';
import { FramePhoto } from './FramePhoto';
import {
  CAPTION_CORRECTED,
  CAPTION_READ,
  DONE,
  LOOKS_RIGHT,
  NOT_QUITE,
  PICK_BY_HAND,
  TITLE_SEVERAL,
  TITLE_SINGLE,
  TITLE_UNCLEAR,
  USE_THIS,
} from './copy';

const TITLES: Record<ColorReading['kind'], string> = {
  single: TITLE_SINGLE,
  several: TITLE_SEVERAL,
  unclear: TITLE_UNCLEAR,
};

// No container here clips its overflow, for the reason FramePhoto.tsx gives:
// the 200% text-size check in e2e/invariants.spec.ts fails any element that
// hides its own overflow.
const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', gap: '16px', flex: '1', minHeight: 0 },
  // `minHeight: 0` lets the pair give up height when the correction panel
  // opens below it, so the panel pushes the photo up instead of the page
  // growing a scrollbar.
  pair: { display: 'flex', gap: '8px', flex: '1', minHeight: 0 },
  block: {
    flex: '1',
    minWidth: 0,
    minHeight: tokens.touchTarget,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: '2px',
    padding: '14px',
    borderRadius: tokens.radius,
  },
  // Dynamic: the color is a runtime value (ADR 0002).
  fill: (background: string, foreground: string) => ({
    backgroundColor: background,
    color: foreground,
  }),
  // Same hairline as ColorBlock: White, Cream and Light grey have no edge
  // against the background without it.
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  actions: { display: 'flex', gap: '8px' },
  // Picker.tsx's link style, for the same reason: a link is a hit target.
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touchTarget,
    color: tokens.ink,
    fontSize: tokens.textBody,
    textAlign: 'center',
  },
});

function firstColor(reading: ColorReading): Hex | null {
  switch (reading.kind) {
    case 'single':
      return reading.color;
    case 'several':
      return reading.colors[0]?.color ?? null;
    case 'unclear':
      return null;
  }
}

/**
 * Shows the color the camera read next to the photo it came from, so the user
 * can accept it or correct it without retaking the shot. Reading a garment's
 * color from a photo is unreliable, and retaking is the expensive way to fix a
 * near miss.
 *
 * A reading comes in three kinds, and each is a state of this screen; the
 * comment on `ColorReading` records what was decided for each and why.
 *
 * The guard sends a visit with nothing to confirm back to the camera. The
 * pixels live only in the in-memory session, so a reload, or a capture made
 * for another slot, leaves this screen with nothing to show.
 */
export function Confirm() {
  const slot = useSlotParam();
  const { state } = useSession();
  if (!slot) return <Navigate to="/slot?next=camera" replace />;
  if (!state.capture || state.capture.slot !== slot) {
    return <Navigate to={`/camera?slot=${slot}`} replace />;
  }
  return <ConfirmForCapture slot={slot} pixels={state.capture.frame.pixels} />;
}

/**
 * Split out of `Confirm` for the reason `PickerForSlot` is split out of
 * `Picker`: this TypeScript version does not carry the guard's narrowing into
 * closures, and `confirm` below needs `slot` as a `Slot`.
 */
function ConfirmForCapture({ slot, pixels }: { slot: Slot; pixels: Pixels }) {
  const { dispatch } = useSession();
  const navigate = useNavigate();

  const initial = useMemo(() => readColor(pixels), [pixels]);
  const [reading] = useState<ColorReading>(initial);
  const [tap] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Hex | null>(firstColor(initial));
  const [shift, setShift] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const shown = selected && shift !== 0 ? withLightness(selected, shift) : selected;
  const corrected = reading.kind === 'single' && shown !== reading.color;

  // The reading and the hex the user settled on are both in scope here, so
  // this is where #22 records how far apart they were.
  function confirm(hex: Hex) {
    // `baseChosen` clears the capture. React Router 8 applies a navigation
    // inside a transition, so a plain dispatch would render on its own first,
    // and the guard in `Confirm` would send the user to the camera before
    // the navigation landed. In one transition the two render together.
    startTransition(() => {
      dispatch({ type: 'baseChosen', slot, hex });
      void navigate(`/suggest?slot=${slot}&hex=${encodeURIComponent(hex)}`);
    });
  }

  function select(hex: Hex) {
    setSelected(hex);
    setShift(0);
  }

  return (
    // The key remounts Screen when the reading changes kind, which re-runs
    // its focus effect: the new heading takes focus, and a screen reader
    // announces the change of state.
    <Screen key={reading.kind} title={TITLES[reading.kind]}>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.pair)}>
          <FramePhoto pixels={pixels} {...(tap && { mark: tap })} />
          {reading.kind === 'single' && shown && (
            <div
              role="group"
              aria-label={blockLabel(slot, shown)}
              {...stylex.props(
                styles.block,
                styles.fill(shown, readableForeground(shown).color),
                needsBorder(shown) && styles.hairline,
              )}
            >
              <span {...stylex.props(blockText.slot)}>
                {corrected ? CAPTION_CORRECTED : CAPTION_READ}
              </span>
              <span {...stylex.props(blockText.name)}>{colorName(shown)}</span>
            </div>
          )}
        </div>
        {reading.kind === 'single' && selected && shown && (
          <>
            {panelOpen && (
              <CorrectionPanel
                id="correction"
                reading={reading.color}
                selected={selected}
                shift={shift}
                onSelect={select}
                onShift={setShift}
                onClose={() => setPanelOpen(false)}
              />
            )}
            <div {...stylex.props(styles.actions)}>
              <Button
                variant="secondary"
                label={panelOpen ? DONE : NOT_QUITE}
                onClick={() => setPanelOpen((open) => !open)}
                expanded={panelOpen}
                controls="correction"
              />
              <Button label={corrected ? USE_THIS : LOOKS_RIGHT} onClick={() => confirm(shown)} />
            </div>
          </>
        )}
        <Link to={`/color?slot=${slot}`} {...stylex.props(styles.link)}>
          {PICK_BY_HAND}
        </Link>
      </div>
    </Screen>
  );
}
