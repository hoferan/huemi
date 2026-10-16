import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../../../color/contrast';
import { hexToRgb, hslToHex, rgbToHsl } from '../../../color/convert';
import { withLightness } from '../../../color/oklab';
import { colorName } from '../../../color/palette';
import type { Hex } from '../../../model/hex';
import { tokens } from '../../../styles/tokens.stylex';
import { blockText } from '../../../ui/blockText';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { clearOfToasts } from '../../../ui/toastClearance';
import { CorrectionPanel } from '../../confirm/CorrectionPanel';
import { FramePhoto } from '../../confirm/FramePhoto';
import { ColorSliders, type Hsl } from '../../pick/ColorSliders';
import { MENU_BACK } from '../field/copy';
import {
  BACK,
  CLOSER,
  LOOK_AT_GARMENT,
  MATCH_GARMENT,
  MISSES,
  NONE_OF_THESE,
  PICK_CLOSER,
  QUESTION_READING,
  READING_TITLE,
  SKIP,
  SKIPPED,
  USE_THIS,
  readCaption,
  trueCaption,
} from './copy';
import type { Answer, Shot } from './readingRunState';
import { VoteCard } from './VoteCard';

const styles = stylex.create({
  // The photo and the color side by side, as on the confirm screen, so the
  // two are compared rather than remembered.
  pair: { display: 'flex', gap: '8px', minHeight: '200px' },
  block: {
    flex: '1',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '14px',
    borderRadius: tokens.radius,
  },
  // Dynamic: the color is a runtime value (ADR 0002).
  fill: (background: string, foreground: string) => ({
    backgroundColor: background,
    color: foreground,
  }),
  // White, Cream and Light grey have no edge against the page without it.
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  hint: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
  actions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  heading: { fontFamily: tokens.fontHeading, fontSize: tokens.textBody, margin: 0 },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  miss: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
  },
  thumb: { display: 'flex', flexDirection: 'column', width: '96px', flexShrink: 0 },
  colors: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: tokens.textBody },
  color: { display: 'flex', alignItems: 'center', gap: '8px' },
  swatch: { width: '32px', height: '32px', flexShrink: 0, borderRadius: tokens.radiusMedia },
});

/**
 * Says why Use did nothing, the way RunSetup says what is missing: Use stays
 * enabled, since a disabled button gives no reason (A11Y.md).
 */
function PickCloser() {
  return (
    <p role="status" {...stylex.props(styles.hint)}>
      {PICK_CLOSER}
    </p>
  );
}

/** The shot's photo with a color block beside it, named on the block. */
function PhotoAndColor({ shot, color }: { shot: Shot; color: Hex }) {
  return (
    <div {...stylex.props(styles.pair)}>
      <FramePhoto pixels={shot.pixels} />
      <div
        {...stylex.props(
          styles.block,
          styles.fill(color, readableForeground(color).color),
          needsBorder(color) && styles.hairline,
        )}
      >
        <span {...stylex.props(blockText.name)}>{colorName(color)}</span>
      </div>
    </div>
  );
}

/** Is the color the reader read the garment's? A swipe or Yes and No answer. */
export function VoteStep({
  shot,
  progress,
  onYes,
  onNo,
}: {
  shot: Shot;
  progress: ReactNode;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <Screen title={READING_TITLE} back={MENU_BACK}>
      {progress}
      <VoteCard question={QUESTION_READING} onAnswer={(yes) => (yes ? onYes() : onNo())}>
        <PhotoAndColor shot={shot} color={shot.shown} />
      </VoteCard>
    </Screen>
  );
}

/**
 * After No, or straight after a reading that was not one color: the confirm
 * screen's correction panel, starting from what the run showed, with its
 * swatches and lightness slider. Closing the panel goes back to the vote,
 * when there was one.
 */
export function CorrectStep({
  shot,
  progress,
  onUse,
  onNoneOfThese,
  onSkip,
  onBack,
}: {
  shot: Shot;
  progress: ReactNode;
  onUse: (hex: Hex) => void;
  onNoneOfThese: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Hex>(shot.shown);
  const [shift, setShift] = useState(0);
  const [unchanged, setUnchanged] = useState(false);
  const picked = shift === 0 ? selected : withLightness(selected, shift);

  // After No on a single reading, the reading itself is the one answer Use
  // cannot mean: it would record a correction that equals what was rejected.
  // For several and unclear, the largest color is a real correction.
  function use() {
    if (shot.kind === 'single' && picked === shot.shown) setUnchanged(true);
    else onUse(picked);
  }

  return (
    <Screen title={CLOSER} back={MENU_BACK}>
      {progress}
      <p {...stylex.props(styles.hint)}>{LOOK_AT_GARMENT}</p>
      <PhotoAndColor shot={shot} color={picked} />
      <CorrectionPanel
        id="reading-correction"
        reading={shot.shown}
        selected={selected}
        shift={shift}
        onSelect={(hex) => {
          setSelected(hex);
          setShift(0);
          setUnchanged(false);
        }}
        onShift={(delta) => {
          setShift(delta);
          setUnchanged(false);
        }}
        // The reducer ignores it for a reading that had no vote.
        onClose={onBack}
      />
      <div {...clearOfToasts} {...stylex.props(styles.actions)}>
        {unchanged && <PickCloser />}
        <Button label={USE_THIS} onClick={use} />
        <Button label={NONE_OF_THESE} variant="secondary" onClick={onNoneOfThese} />
        <Button label={SKIP} variant="quiet" onClick={onSkip} />
      </div>
    </Screen>
  );
}

/**
 * None of the swatches was close: hue, saturation and lightness, starting
 * from what the run showed. Back returns to the swatches.
 */
export function SlidersStep({
  shot,
  progress,
  onUse,
  onSkip,
  onBack,
}: {
  shot: Shot;
  progress: ReactNode;
  onUse: (hex: Hex) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [hsl, setHsl] = useState<Hsl>(() => {
    // Rounded, since the sliders step in whole units.
    const [hue, saturation, lightness] = rgbToHsl(hexToRgb(shot.shown));
    return {
      hue: Math.round(hue),
      saturation: Math.round(saturation),
      lightness: Math.round(lightness),
    };
  });
  // Whether any slider has moved. The seed is rounded to whole units, so an
  // untouched set can differ from the reading by a rounding step, and
  // comparing colors would let that through as a correction.
  const [moved, setMoved] = useState(false);
  const [unchanged, setUnchanged] = useState(false);
  const hex = hslToHex(hsl.hue, hsl.saturation, hsl.lightness);

  // As on the correct step: a single reading rejected and then used as it was
  // is no correction.
  function use() {
    if (shot.kind === 'single' && !moved) setUnchanged(true);
    else onUse(hex);
  }

  return (
    <Screen title={MATCH_GARMENT} back={MENU_BACK}>
      {progress}
      <p {...stylex.props(styles.hint)}>{LOOK_AT_GARMENT}</p>
      <PhotoAndColor shot={shot} color={hex} />
      <ColorSliders
        hsl={hsl}
        onChange={(next) => {
          setHsl(next);
          setMoved(true);
          setUnchanged(false);
        }}
        idPrefix="reading-"
      />
      <div {...clearOfToasts} {...stylex.props(styles.actions)}>
        {unchanged && <PickCloser />}
        <Button label={USE_THIS} onClick={use} />
        <Button label={SKIP} variant="quiet" onClick={onSkip} />
        <Button label={BACK} variant="quiet" onClick={onBack} />
      </div>
    </Screen>
  );
}

/** A color as a small swatch with its words beside it, which carry its name. */
function Named({ color, text }: { color: Hex | null; text: string }) {
  return (
    <span {...stylex.props(styles.color)}>
      {color && (
        <span
          aria-hidden="true"
          {...stylex.props(
            styles.swatch,
            styles.fill(color, readableForeground(color).color),
            needsBorder(color) && styles.hairline,
          )}
        />
      )}
      <span>{text}</span>
    </span>
  );
}

/** Every answer the reader did not get right, with its photo, what it read and what was true. */
export function Misses({ answers }: { answers: readonly Answer[] }) {
  const misses = answers.filter((answer) => answer.verdict !== 'right');
  if (misses.length === 0) return null;
  return (
    <section {...stylex.props(styles.section)}>
      <h2 id="reading-misses" {...stylex.props(styles.heading)}>
        {MISSES}
      </h2>
      <ul aria-labelledby="reading-misses" {...stylex.props(styles.list)}>
        {misses.map(({ captureId, shot, truth }) => (
          <li key={captureId} {...stylex.props(styles.miss)}>
            <span {...stylex.props(styles.thumb)}>
              <FramePhoto pixels={shot.pixels} />
            </span>
            <span {...stylex.props(styles.colors)}>
              <Named color={shot.shown} text={readCaption(shot.kind, colorName(shot.shown))} />
              <Named color={truth} text={truth ? trueCaption(colorName(truth)) : SKIPPED} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
