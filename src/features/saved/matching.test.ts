import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { composeOutfit } from '../../session/select';
import { buildOutfit } from './buildOutfit';
import { sameOutfit } from './matching';
import { NAVY_BOTTOM } from './testing';

const picks = composeOutfit(NAVY_BOTTOM, {}, () => 0);
const saved = buildOutfit(NAVY_BOTTOM, picks, 'x', new Date());

describe('sameOutfit', () => {
  it('matches the combination it was built from', () => {
    expect(sameOutfit(saved, NAVY_BOTTOM, picks)).toBe(true);
  });

  it('does not match once one piece differs', () => {
    const changed = { ...picks, shoes: { hex: parseHex('#f7f6f3'), cursor: 9 } };
    expect(sameOutfit(saved, NAVY_BOTTOM, changed)).toBe(false);
  });

  it('ignores cursors, which are not part of an outfit', () => {
    const moved = { ...picks, shoes: { hex: picks.shoes!.hex } };
    expect(sameOutfit(saved, NAVY_BOTTOM, moved)).toBe(true);
  });

  it('does not match the same colour worn in another slot', () => {
    expect(sameOutfit(saved, { slot: 'top', hex: NAVY_BOTTOM.hex }, picks)).toBe(false);
  });

  it('does not match another base colour', () => {
    expect(sameOutfit(saved, { slot: 'bottom', hex: parseHex('#1b1b1b') }, picks)).toBe(false);
  });
});
