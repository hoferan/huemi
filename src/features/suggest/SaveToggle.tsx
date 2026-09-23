import { useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Bookmark } from 'lucide-react';
import type { Slot } from '../../model/types';
import type { Base, SlotPick } from '../../session/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { buildOutfit } from '../saved/buildOutfit';
import { makeOutfitId } from '../saved/makeOutfitId';
import { sameOutfit } from '../saved/matching';
import { useOutfits } from '../saved/useOutfits';

const styles = stylex.create({
  toggle: {
    display: 'grid',
    placeItems: 'center',
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: '999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    backgroundColor: { default: 'transparent', ':hover': tokens.surface },
    color: tokens.ink,
    cursor: 'pointer',
  },
});

/**
 * The bookmark. Pressed when what is on screen is exactly a saved outfit,
 * which is derived from the list rather than remembered, so changing any
 * piece empties it and saving then makes a second outfit instead of
 * overwriting the first.
 *
 * Pressing it filled removes every matching outfit, with Undo. Focus stays
 * here, because the button survives and pressing it again is itself an undo.
 *
 * A press is ignored while the previous one is still writing, so a quick
 * double tap cannot save the same outfit twice. The guard is a ref, not
 * state: both clicks of a double tap arrive before React re-renders, so the
 * second would still read the old state.
 */
export function SaveToggle({
  base,
  picks,
}: {
  base: Base;
  picks: Partial<Record<Slot, SlotPick>>;
}) {
  const outfits = useOutfits();
  const { dispatch } = useSession();
  const inFlight = useRef(false);

  const matches =
    outfits.state.status === 'ready'
      ? outfits.state.outfits.filter((outfit) => sameOutfit(outfit, base, picks))
      : [];
  const pressed = matches.length > 0;

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (pressed) {
        const ok = await outfits.remove(matches.map((outfit) => outfit.id));
        dispatch(
          ok
            ? {
                type: 'toastShown',
                message: 'Removed from saved',
                action: { label: 'Undo', kind: 'undoDelete', outfits: matches },
              }
            : { type: 'toastShown', message: "Couldn't remove this outfit." },
        );
      } else {
        const ok = await outfits.save(buildOutfit(base, picks, makeOutfitId(), new Date()));
        dispatch({
          type: 'toastShown',
          message: ok ? 'Saved' : "Couldn't save this outfit on this device.",
        });
      }
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <button
      type="button"
      aria-label="Save outfit"
      aria-pressed={pressed}
      onClick={() => void toggle()}
      {...stylex.props(styles.toggle)}
    >
      <Bookmark size={22} aria-hidden="true" fill={pressed ? 'currentColor' : 'none'} />
    </button>
  );
}
