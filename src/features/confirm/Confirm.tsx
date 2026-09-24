import { startTransition, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../../color/contrast';
import { withLightness } from '../../color/oklab';
import { blockLabel, colorName } from '../../color/palette';
import { readColor, tapRegion, type ColorReading } from '../../color/read';
import type { Pixels } from '../../model/frame';
import type { Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { blockText } from '../../ui/blockText';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { useAnnounce } from '../../ui/useAnnounce';
import { useSlotParam } from '../pick/useSlotParam';
import { CorrectionPanel } from './CorrectionPanel';
import { FramePhoto } from './FramePhoto';
import {
  CAPTION_CORRECTED,
  CAPTION_READ,
  colorAction,
  DONE,
  LOOKS_RIGHT,
  NEITHER,
  NOT_QUITE,
  PICK_BY_HAND,
  STILL_UNCLEAR,
  TAP_ELSEWHERE,
  TITLE_SEVERAL,
  TITLE_SINGLE,
  TITLE_UNCLEAR,
  UNCLEAR_BODY,
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
  choices: { display: 'flex', gap: '8px' },
  // Each choice is a button of its own, swatch above and name below, rather
  // than reusing `Swatch`: that component's name is screen-reader-only, and
  // here the name has to be the visible label the spec asks for, with the
  // share folded into the accessible name instead (see `ColorChoice`).
  choice: {
    flex: '1',
    minWidth: tokens.touchTarget,
    minHeight: tokens.touchTarget,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderStyle: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    cursor: 'pointer',
  },
  choiceSwatch: { minHeight: tokens.touchTarget, borderRadius: tokens.radius },
  // Dynamic: the color is a runtime value (ADR 0002).
  choiceFill: (background: string) => ({ backgroundColor: background }),
  choiceName: { fontSize: tokens.textBody, color: tokens.ink, textAlign: 'center' },
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
  // Entry.tsx's body style: ink2, not the block's on-color foreground, since
  // this text sits on the page background rather than a swatch.
  unclearBody: {
    color: tokens.ink2,
    fontSize: tokens.textBody,
    lineHeight: 1.5,
    margin: 0,
  },
});

/**
 * One choice in the `several` state's group: a swatch with its name shown
 * underneath, so every option carries a name a colour-vision-deficient user
 * can read, not only the selected one.
 *
 * Two stripes can land on the same palette name (a dark and a darker navy,
 * say) while covering different areas of the garment. The share is folded
 * into the accessible name so a screen reader still tells them apart.
 */
function ColorChoice({
  color,
  share,
  selected,
  onSelect,
}: {
  color: Hex;
  share: number;
  selected: boolean;
  onSelect: (hex: Hex) => void;
}) {
  const name = colorName(color);
  return (
    <button
      type="button"
      onClick={() => onSelect(color)}
      aria-pressed={selected}
      aria-label={`${name}, ${Math.round(share * 100)}% of the area`}
      {...stylex.props(styles.choice)}
    >
      <span
        {...stylex.props(
          styles.choiceSwatch,
          styles.choiceFill(color),
          needsBorder(color) && styles.hairline,
        )}
      />
      <span {...stylex.props(styles.choiceName)}>{name}</span>
    </button>
  );
}

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
  const announce = useAnnounce();

  const initial = useMemo(() => readColor(pixels), [pixels]);
  const [reading, setReading] = useState<ColorReading>(initial);
  const [fromTap, setFromTap] = useState(false);
  const [missed, setMissed] = useState(false);
  const [tap, setTap] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Hex | null>(firstColor(initial));
  const [shift, setShift] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

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

  // The panel's handle, or a swipe, closes it from inside, and the handle
  // unmounts with it. Without this, focus would fall back to the body.
  // Closing with "Done" needs nothing, because focus is already on the toggle.
  function closePanel() {
    setPanelOpen(false);
    toggle.current?.focus();
  }

  function select(hex: Hex) {
    setSelected(hex);
    setShift(0);
  }

  // Reads again around the tap instead of trusting the default centered
  // region. A failed tap keeps the unclear state and only speaks through the
  // live region (nothing else moves, so nothing else would carry the news);
  // a successful one behaves like the initial read, down to resetting the
  // panel, since it is one.
  function onTap(x: number, y: number) {
    const next = readColor(pixels, tapRegion(pixels, x, y));
    setTap({ x, y });
    if (next.kind === 'unclear') {
      setMissed(true);
      announce(STILL_UNCLEAR);
      return;
    }
    setMissed(false);
    setFromTap(true);
    setReading(next);
    setSelected(firstColor(next));
    setShift(0);
    setPanelOpen(false);
  }

  // Reachable only from a reading that came from a tap: retaking is the only
  // way back to unclear otherwise, and that is a heavier fix for what might
  // be a single mis-tap. The mark stays on the photo, so the user sees where
  // the last tap landed while they try again.
  function tapElsewhere() {
    setReading({ kind: 'unclear' });
    setMissed(false);
  }

  return (
    // The key remounts Screen when the reading changes kind, which re-runs
    // its focus effect: the new heading takes focus, and a screen reader
    // announces the change of state.
    <Screen key={reading.kind} title={TITLES[reading.kind]}>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.pair)}>
          <FramePhoto
            pixels={pixels}
            {...(reading.kind === 'unclear' && { onTap })}
            {...(tap && { mark: tap })}
          />
          {(reading.kind === 'single' || reading.kind === 'several') && shown && (
            <div
              role="group"
              aria-label={blockLabel(slot, shown)}
              {...stylex.props(
                styles.block,
                styles.fill(shown, readableForeground(shown).color),
                needsBorder(shown) && styles.hairline,
              )}
            >
              {reading.kind === 'single' && (
                <span {...stylex.props(blockText.slot)}>
                  {corrected ? CAPTION_CORRECTED : CAPTION_READ}
                </span>
              )}
              <span {...stylex.props(blockText.name)}>{colorName(shown)}</span>
            </div>
          )}
        </div>
        {reading.kind === 'unclear' && (
          <p {...stylex.props(styles.unclearBody)}>{missed ? STILL_UNCLEAR : UNCLEAR_BODY}</p>
        )}
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
                onClose={closePanel}
              />
            )}
            <div {...stylex.props(styles.actions)}>
              <Button
                ref={toggle}
                variant="secondary"
                label={panelOpen ? DONE : NOT_QUITE}
                onClick={() => setPanelOpen((open) => !open)}
                expanded={panelOpen}
                controls="correction"
              />
              <Button label={corrected ? USE_THIS : LOOKS_RIGHT} onClick={() => confirm(shown)} />
            </div>
            {fromTap && <Button variant="secondary" label={TAP_ELSEWHERE} onClick={tapElsewhere} />}
          </>
        )}
        {reading.kind === 'several' && selected && (
          <>
            <div role="group" aria-label={TITLE_SEVERAL} {...stylex.props(styles.choices)}>
              {reading.colors.map(({ color, share }) => (
                <ColorChoice
                  key={color}
                  color={color}
                  share={share}
                  selected={color === selected}
                  onSelect={select}
                />
              ))}
            </div>
            <Button label={colorAction(colorName(selected))} onClick={() => confirm(selected)} />
            {fromTap && <Button variant="secondary" label={TAP_ELSEWHERE} onClick={tapElsewhere} />}
          </>
        )}
        <Link to={`/color?slot=${slot}`} {...stylex.props(styles.link)}>
          {reading.kind === 'several' ? NEITHER : PICK_BY_HAND}
        </Link>
      </div>
    </Screen>
  );
}
