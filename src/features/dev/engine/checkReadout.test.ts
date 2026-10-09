import { describe, expect, it } from 'vitest';
import { TONAL_LIMIT, checkOutfit, measureOutfit, type WornPieces } from '../../../color/check';
import { TUNING } from '../../../color/engine';
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
        'mixed: Cream top warm (0.025) · Navy bottom cool (0.040)',
        'contrast: gap 0.62 over 0.19 · Cream top to Navy bottom',
      ],
      pieces: [
        'Top · Cream · L 0.91 · C 0.031 · carries 0.025 · warm',
        'Bottom · Navy · L 0.29 · C 0.050 · carries 0.040 · cool',
      ],
    });
  });

  // Like `checkOutfit`, it has nothing to say about one piece.
  it('reads nothing from an outfit of one piece', () => {
    expect(checkReadout(outfit({ top: 'Navy' }), [])).toEqual({ observations: [], pieces: [] });
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

  // The sentences name pieces by the color they carry, chroma times the area
  // of the slot, which is why small Mustard shoes lose to Navy trousers. The
  // panel has to show that number for every piece, or it cannot say why.
  it('shows the color each piece carries, which decides the pieces named', () => {
    const { observations, pieces } = readout(
      outfit({ outerwear: 'Grey', top: 'Cream', bottom: 'Navy', shoes: 'Mustard' }),
    );
    expect(observations[0]).toMatch(/most from Navy bottom \(0\.040\)$/);
    expect(observations[1]).toBe(
      'mixed: Cream top warm (0.025) · Navy bottom cool (0.040) · Mustard shoes warm (0.018)',
    );
    expect(pieces[3]).toBe('Shoes · Mustard · L 0.71 · C 0.122 · carries 0.018 · warm');
  });

  // An outfit at a threshold is the one a developer opens the panel for.
  it('never prints a measurement like its threshold unless they are equal', () => {
    let near = 0;
    for (const top of PALETTE) {
      for (const bottom of PALETTE) {
        const pieces: WornPieces = { top: top.hex, bottom: bottom.hex, shoes: hex('Grey') };
        const measures = measureOutfit(pieces)!;
        // `checkOutfit` puts the color sentence first and lightness last.
        const lines = readout(pieces).observations;
        const color = lines[0]!;
        const lightness = lines.at(-1)!;
        const gap = lightness.match(/gap (\S+) (?:over|within) (\S+)/)!;
        if (Math.abs(measures.lightnessGap - TONAL_LIMIT) < 0.005) near += 1;
        if (gap[1] === gap[2]) expect(measures.lightnessGap).toBe(TONAL_LIMIT);
        const load = color.match(/chroma (\S+) (?:over|of) (\S+)/);
        if (load && load[1] === load[2]) expect(measures.load).toBe(TUNING.chromaBudget);
      }
    }
    expect(near).toBeGreaterThan(0);
  });
});
