import type { ReactElement } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ChevronRight, Lock, LockOpen } from 'lucide-react';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { SLOT_LABELS, type Slot } from '../model/types';
import { tokens } from '../styles/tokens.stylex';
import { blockText, fieldLayout } from './blockText';
import { ColorBlock } from './ColorBlock';

const PRESSED_TINT = 'color-mix(in srgb, currentColor 24%, transparent)';

const styles = stylex.create({
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
    // tint under the thumb and on focus, so a tap still visibly lands.
    backgroundColor: { default: 'transparent', ':active': PRESSED_TINT },
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
}: {
  slot: Slot;
  hex: Hex;
  position: string | null;
  kept: boolean;
  onNext: () => void;
  onKeepToggle: () => void;
  onOpenAlternatives: () => void;
}): ReactElement {
  const label = SLOT_LABELS[slot];
  const KeepIcon = kept ? Lock : LockOpen;

  return (
    <ColorBlock slot={slot} hex={hex}>
      <button
        type="button"
        onClick={onOpenAlternatives}
        aria-label={`Other options for ${label}`}
        {...stylex.props(fieldLayout.field, styles.field)}
      >
        <span {...stylex.props(blockText.slot)}>{label}</span>
        <span {...stylex.props(blockText.name)}>{colorName(hex)}</span>
        {position !== null && <span {...stylex.props(blockText.position)}>{position}</span>}
      </button>
      <div {...stylex.props(styles.rail)}>
        <button
          type="button"
          onClick={onKeepToggle}
          aria-pressed={kept}
          aria-label={`Keep ${label}`}
          {...stylex.props(styles.control, kept && styles.kept)}
        >
          <KeepIcon size={19} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={kept}
          aria-label={`Next suggestion for ${label}`}
          {...stylex.props(styles.control, kept && styles.disabled)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </ColorBlock>
  );
}
