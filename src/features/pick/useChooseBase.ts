import { useNavigate } from 'react-router';
import type { Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';

/** Commits a base picked by hand, from the swatches or from the mixer. */
export function useChooseBase(slot: Slot): (hex: Hex) => void {
  const { dispatch } = useSession();
  const navigate = useNavigate();

  return (hex) => {
    dispatch({ type: 'baseChosen', slot, hex });
    // The base travels in the URL, not only in the session, so a refresh of
    // the suggestions screen rebuilds the same outfit (ADR 0011).
    void navigate(`/suggest?slot=${slot}&hex=${encodeURIComponent(hex)}`);
  };
}
