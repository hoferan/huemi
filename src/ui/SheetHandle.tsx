import type { PointerEvent as ReactPointerEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

const styles = stylex.create({
  handle: {
    alignSelf: 'center',
    width: '56px',
    minHeight: tokens.touchTarget,
    display: 'grid',
    placeItems: 'center',
    borderStyle: 'none',
    backgroundColor: 'transparent',
    cursor: 'grab',
    touchAction: 'none',
  },
  grip: { width: '44px', height: '5px', borderRadius: '999px', backgroundColor: tokens.ink2 },
});

/**
 * The drag handle shared by the modal `Sheet` and the confirm screen's
 * in-layout correction panel, both of which close the same way.
 *
 * It is a real `<button>`, not a decorative bar. Drag is a pointer
 * affordance, but a touch user who cannot drag needs a target that closes on
 * tap, and a screen reader needs something to announce. Sharing it here means
 * the click-after-drag guard below is written once instead of twice, where a
 * second copy would be easy to get subtly wrong.
 */
export function SheetHandle({
  label,
  onClose,
  onPointerDown,
  dragged,
}: {
  label: string;
  onClose: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  dragged: () => boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      // A keyboard activation cannot be what a drag meant to suppress, so it
      // clears the flag on the way past. The same shape SuggestionBlock uses,
      // for the same reason: a drag released off the handle never produces
      // the click that would have cleared it.
      onKeyDown={() => {
        dragged();
      }}
      // The handle is the drag target and the tap-to-close control at once,
      // and a press and release inside it produces a click whatever the drag
      // decided. Without this, grabbing the handle, pulling down, changing
      // your mind and pulling back up closes whatever the spring just put
      // back.
      onClick={() => {
        if (dragged()) return;
        onClose();
      }}
      {...stylex.props(styles.handle)}
    >
      <span {...stylex.props(styles.grip)} />
    </button>
  );
}
