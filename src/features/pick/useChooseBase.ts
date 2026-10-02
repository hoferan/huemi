import { useNavigate } from 'react-router';
import type { Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { localCorrections } from '../../storage/localCorrections';

/**
 * Commits a base picked by hand, from the swatches or from the mixer.
 *
 * When the user got here by turning down a camera reading, the pick is what
 * the garment really is, and the reading goes into the correction log against
 * it: the miss was too big to fix on the confirm screen, which makes it the
 * most useful entry the log gets. `baseChosen` clears the capture, so coming
 * back to pick again records nothing more.
 *
 * Nothing else clears the capture, so a reading turned down and then left
 * behind still counts when the user comes back to the picker for that slot
 * by another route. The log takes that rare stray entry rather than the
 * session growing a reset on Home just for this.
 */
export function useChooseBase(slot: Slot): (hex: Hex) => void {
  const { state, dispatch } = useSession();
  const navigate = useNavigate();
  const read = state.capture?.slot === slot ? state.capture.read : undefined;

  return (hex) => {
    if (read !== undefined && hex !== read) {
      void localCorrections.record({ slot, read, corrected: hex, at: new Date().toISOString() });
    }
    dispatch({ type: 'baseChosen', slot, hex });
    // The base travels in the URL, not only in the session, so a refresh of
    // the suggestions screen rebuilds the same outfit (ADR 0011).
    void navigate(`/suggest?slot=${slot}&hex=${encodeURIComponent(hex)}`);
  };
}
