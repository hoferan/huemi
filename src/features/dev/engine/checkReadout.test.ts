import { describe, expect, it } from 'vitest';
import { checkOutfit, type WornPieces } from '../../../color/check';
import { PALETTE } from '../../../color/palette';
import type { Hex } from '../../../model/hex';
import type { CheckSlot } from '../../../model/types';
import { checkReadout } from './checkReadout';

const hex = (name: string): Hex => PALETTE.find((color) => color.name === name)!.hex;
const outfit = (names: Partial<Record<CheckSlot, string>>): WornPieces =>
  Object.fromEntries(Object.entries(names).map(([slot, name]) => [slot, hex(name)]));
const readout = (pieces: WornPieces) => checkReadout(pieces, checkOutfit(pieces)!);

describe('checkReadout', () => {
  it('puts each sentence of a Cream top over Navy trousers beside its numbers', () => {
    expect(readout(outfit({ top: 'Cream', bottom: 'Navy' }))).toEqual({
      observations: [
        'quiet: chroma 0.065 of 0.120 · most from Navy bottom (0.040)',
        'mixed: Cream top warm · Navy bottom cool',
        'contrast: gap 0.62 over 0.19 · Cream top to Navy bottom',
      ],
      pieces: ['Top · Cream · L 0.91 · C 0.031 · warm', 'Bottom · Navy · L 0.29 · C 0.050 · cool'],
    });
  });

  it('says over the budget for a colorful outfit', () => {
    const [color] = readout(outfit({ top: 'Rust', bottom: 'Mustard' })).observations;
    expect(color).toMatch(/^colorful: chroma 0\.\d{3} over 0\.120 · most from /);
  });

  it('says within the limit for a tonal outfit', () => {
    const { observations } = readout(outfit({ top: 'Navy', bottom: 'Charcoal' }));
    expect(observations.at(-1)).toMatch(/^tonal: gap 0\.\d{2} within 0\.19$/);
  });

  it('marks the pieces named as neutrals', () => {
    const { observations, pieces } = readout(outfit({ top: 'Grey', bottom: 'Charcoal' }));
    expect(observations[0]).toMatch(/^neutral: /);
    expect(pieces[0]).toMatch(/^Top · Grey · .* · named neutral$/);
  });

  // The screen says nothing about warm and cool with one colored piece, so
  // the panel must not either.
  it('has no warmth line when the check has no warmth sentence', () => {
    const pieces = outfit({ top: 'Rust', bottom: 'Grey' });
    const { observations } = readout(pieces);
    expect(observations).toHaveLength(checkOutfit(pieces)!.length);
    expect(observations.some((line) => /^(warm|cool|mixed):/.test(line))).toBe(false);
  });
});
