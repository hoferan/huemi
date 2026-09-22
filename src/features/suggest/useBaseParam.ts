import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseHex } from '../../model/hex';
import { SLOTS } from '../../model/types';
import type { Base } from '../../session/types';

/**
 * The base garment, carried in the URL so the core screen survives a refresh
 * (ADR 0011). It is the only thing that travels: the picks are rebuilt from it
 * by `composeOutfit`, which is deterministic when seeded.
 *
 * Validated with `parseHex` rather than `isHex`. `isHex` narrows to values
 * already in canonical form, which is right for a value read back from
 * storage and wrong for one a person can type: `#ABC` and `#A3231F` are
 * colours anyone would expect to work, and bouncing them to the entry screen
 * would be a redirect with no visible cause.
 *
 * Memoised on the two raw strings because the result is an object. Without
 * that, every render produces a new one and an effect depending on it never
 * stops running.
 */
export function useBaseParam(): Base | null {
  const [params] = useSearchParams();
  const slotParam = params.get('slot');
  const hexParam = params.get('hex');

  return useMemo(() => {
    const slot = SLOTS.find((candidate) => candidate === slotParam);
    if (!slot || hexParam === null) return null;
    try {
      return { slot, hex: parseHex(hexParam) };
    } catch {
      return null;
    }
  }, [slotParam, hexParam]);
}
