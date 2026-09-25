import { describe, expect, it } from 'vitest';
import type { Hex } from '../model/hex';
import type { CheckSlot } from '../model/types';
import { PALETTE } from './palette';
import { warmCoolStrength, type WornPieces } from './check';

/** A palette color by name, so every fixture has a name `colorName` returns exactly. */
const hex = (name: string): Hex => {
  const found = PALETTE.find((color) => color.name === name);
  if (!found) throw new Error(`No palette color called ${name}`);
  return found.hex;
};

const outfit = (names: Partial<Record<CheckSlot, string>>): WornPieces =>
  Object.fromEntries(Object.entries(names).map(([slot, name]) => [slot, hex(name)]));

// Measured against the shipped engine on 2026-09-25.
const CLASSIC = outfit({ outerwear: 'Navy', top: 'Cream', bottom: 'Charcoal', shoes: 'Brown' });
const MIXED_ONLY = outfit({ top: 'Denim', bottom: 'Grey', shoes: 'Rust' });
const OVER_BOTTOM = outfit({ outerwear: 'Camel', top: 'Cream', bottom: 'Mustard', shoes: 'Rust' });
const NEUTRAL = outfit({ outerwear: 'Black', top: 'White', bottom: 'Charcoal', shoes: 'Black' });

describe('warmCoolStrength', () => {
  it('is zero when every colored piece sits on the same side', () => {
    expect(warmCoolStrength(OVER_BOTTOM)).toBe(0);
  });

  it('is zero for neutrals, which have no side', () => {
    expect(warmCoolStrength(NEUTRAL)).toBe(0);
  });

  // Brown's chroma of 0.047 ramps to about half strength, which is why navy
  // with brown shoes is a faint disagreement rather than a loud one.
  it('reads navy against brown as faint', () => {
    expect(warmCoolStrength(CLASSIC)).toBeCloseTo(0.45, 2);
  });

  it('reads denim against rust as strong', () => {
    expect(warmCoolStrength(MIXED_ONLY)).toBeCloseTo(0.73, 2);
  });
});
