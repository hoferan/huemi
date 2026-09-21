import { useRef, type ReactElement } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ChevronRight, Lock, LockOpen } from 'lucide-react';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { SLOT_LABELS, type Slot } from '../model/types';
import { tokens } from '../styles/tokens.stylex';
import { blockText, fieldLayout } from './blockText';
import { ColorBlock } from './ColorBlock';
import { blockControl, useBlockGestures } from './useBlockGestures';

const PRESSED_TINT = 'color-mix(in srgb, currentColor 24%, transparent)';

const styles = stylex.create({
  // Composed onto every control rather than written into each: the ring is
  // drawn inside the element, not around it, because the block clips
  // (`overflow: hidden`, for the corner radius) and the controls sit flush
  // with its edges, so an outset ring would be cut off on two or three sides
  // of every one of them. `currentColor` is the foreground
  // `readableForeground` chose, so the ring clears 3:1 on any block colour
  // instead of inheriting the browser's default, which is picked without
  // knowing what is underneath it.
  focusRing: {
    outlineColor: 'currentColor',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: '3px',
    outlineOffset: '-3px',
  },
  field: {
    minHeight: tokens.touchTarget,
    textAlign: 'start',
    font: 'inherit',
    color: 'inherit',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    cursor: 'pointer',
  },
  rail: { flexShrink: 0, display: 'flex' },
  control: {
    // Wider than the 44px floor: the pair reads as one column down the screen,
    // and a thumb that is not looking has somewhere forgiving to land. The
    // minimum is the token, so a future width edit cannot drop under it.
    width: '58px',
    minWidth: tokens.touchTarget,
    minHeight: tokens.touchTarget,
    alignSelf: 'stretch',
    display: 'grid',
    placeItems: 'center',
    font: 'inherit',
    color: 'inherit',
    borderStyle: 'none',
    cursor: 'pointer',
    // Nothing at rest, because the colour is the content on this screen. A
    // tint under the thumb and on focus, so a tap still visibly lands and a
    // keyboard user can see which of the two the ring is sitting on.
    backgroundColor: {
      default: 'transparent',
      ':active': PRESSED_TINT,
      ':focus-visible': PRESSED_TINT,
    },
  },
  kept: { backgroundColor: PRESSED_TINT },
  disabled: { cursor: 'default', opacity: 0.45 },
});

/**
 * One suggested colour, and the three ways to act on it.
 *
 * The prototype hangs a 30px swipe, a 450ms long press, a nested "next" target
 * and a nested "open alternatives" target off one `<div>`, which forces a
 * `closest()` check and a press-timer sentinel to keep them apart and still
 * leaves no keyboard path at all. This dissolves that: three real buttons,
 * and the gestures in `useBlockGestures` are additional affordances over
 * controls that already work without them.
 *
 * The position arrives already formatted, because `positionLabel` lives in
 * `src/session/select.ts` and `ui` may not import `session`. Null means the
 * position is unknown — `locate` could not find the colour in the list — and
 * the block then says nothing rather than something false.
 */
export function SuggestionBlock({
  slot,
  hex,
  position,
  kept,
  onNext,
  onKeepToggle,
  onOpenAlternatives,
  onPrevious,
}: {
  slot: Slot;
  hex: Hex;
  position: string | null;
  kept: boolean;
  onNext: () => void;
  onKeepToggle: () => void;
  onOpenAlternatives: () => void;
  onPrevious: () => void;
}): ReactElement {
  const label = SLOT_LABELS[slot];
  const name = colorName(hex);
  const KeepIcon = kept ? Lock : LockOpen;

  // The name carries what is written on the field, in the order it is written,
  // so that a Voice Control user saying "click Charcoal" reaches it (2.5.3)
  // and so that the position is announced at all. Leaving the position to the
  // text does not work: an aria-label replaces a button's contents for naming,
  // so a screen reader reading this button reads the name and never the span
  // holding "2 of 5". The slot stays in the name because five blocks share one
  // screen and a list of buttons has to stay distinguishable. An unknown
  // position drops out of the name rather than leaving an empty segment.
  const fieldName = [label, name, position, 'other options']
    .filter((part) => part !== null)
    .join(', ');

  // Set when a gesture has counted, read by the field's click handler. The
  // field is a button covering everything the gestures can be started on, so
  // without this a swipe or a long press releases into a click and opens the
  // alternatives sheet on top of whatever the gesture just did. Cleared at the
  // start of each press on the field, so it can never reach across two
  // sequences, and cleared again when it suppresses, so it can never swallow
  // two clicks.
  const gestured = useRef(false);

  // Additional affordances over controls that already work by keyboard. A
  // swipe is Next or its opposite; a long press is Keep. Nothing here is the
  // only way to do anything, which is what shrinks the disambiguation problem
  // to keeping a gesture off a button press.
  //
  // Disabled while kept, matching the Next button: a kept block has nothing
  // to advance to.
  const gestures = useBlockGestures({
    onSwipe: (delta) => {
      gestured.current = true;
      if (delta === 1) onNext();
      else onPrevious();
    },
    onLongPress: () => {
      gestured.current = true;
      onKeepToggle();
    },
    enabled: !kept,
  });

  return (
    <ColorBlock slot={slot} hex={hex} {...gestures}>
      <button
        type="button"
        onPointerDown={() => {
          gestured.current = false;
        }}
        onClick={() => {
          if (gestured.current) {
            gestured.current = false;
            return;
          }
          onOpenAlternatives();
        }}
        aria-label={fieldName}
        {...stylex.props(fieldLayout.field, styles.field, styles.focusRing)}
      >
        <span {...stylex.props(blockText.slot)}>{label}</span>
        <span {...stylex.props(blockText.name)}>{name}</span>
        {position !== null && <span {...stylex.props(blockText.position)}>{position}</span>}
      </button>
      <div {...stylex.props(styles.rail)}>
        <button
          type="button"
          {...blockControl}
          onClick={onKeepToggle}
          aria-pressed={kept}
          aria-label={`Keep ${label}`}
          {...stylex.props(styles.control, styles.focusRing, kept && styles.kept)}
        >
          <KeepIcon size={19} aria-hidden="true" />
        </button>
        <button
          type="button"
          {...blockControl}
          onClick={onNext}
          disabled={kept}
          aria-label={`Next suggestion for ${label}`}
          {...stylex.props(styles.control, styles.focusRing, kept && styles.disabled)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </ColorBlock>
  );
}
