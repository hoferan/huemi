import { parseHex, type Hex } from '../../model/hex';
import { SLOTS, type Slot } from '../../model/types';
import type { ShareImageInput } from './layout';

export const SHARED_PATH = '/shared';

/**
 * "https://huemi.app/shared?top=c39a3a&bottom=1f2a44&base=bottom". The pieces
 * head to toe as bare hexes, so a link pasted into a chat carries no `%23`,
 * then the base when there is one. A check has none.
 *
 * Links already sent are a contract (ADR 0018): whatever this writes,
 * `parseShareLink` has to go on reading.
 */
export function shareLink(origin: string, { pieces, baseSlot }: ShareImageInput): string {
  const params = new URLSearchParams();
  for (const slot of SLOTS) {
    const hex = pieces[slot];
    if (hex) params.set(slot, hex.slice(1));
  }
  if (baseSlot) params.set('base', baseSlot);
  return `${origin}${SHARED_PATH}?${params.toString()}`;
}

/**
 * The outfit a shared link carries, or null when the link is not one.
 *
 * One piece that will not read rejects the whole link. A chat app that cut
 * the link short has lost part of the outfit, and showing the rest would
 * misrepresent what was sent, and that includes a hex cut to three digits.
 * Parameters it does not know, such as the
 * tracking ones apps append, are ignored, and a hex in capitals or with its
 * `#` still reads.
 */
export function parseShareLink(params: URLSearchParams): ShareImageInput | null {
  const pieces: Partial<Record<Slot, Hex>> = {};
  for (const slot of SLOTS) {
    const value = params.get(slot);
    if (value === null) continue;
    // Six digits only, which is all `shareLink` writes. `parseHex` would take
    // three, and a link cut inside its last hex would read as another color.
    const digits = value.replace(/^#/, '');
    if (!/^[0-9a-f]{6}$/i.test(digits)) return null;
    pieces[slot] = parseHex(`#${digits}`);
  }
  if (Object.keys(pieces).length === 0) return null;

  const base = params.get('base');
  if (base === null) return { pieces, baseSlot: null };
  const baseSlot = SLOTS.find((slot) => slot === base && pieces[slot] !== undefined);
  return baseSlot ? { pieces, baseSlot } : null;
}
