import { describe, expect, it } from 'vitest';
import type { Hex } from '../model/hex';
import type { CheckSlot } from '../model/types';
import { TUNING } from './engine';
import { PALETTE } from './palette';
import { chromaLoad } from './score';
import { checkOutfit, type Observation, type WornPieces } from './check';

/** A palette color by name, so every fixture has a name `colorName` returns exactly. */
const hex = (name: string): Hex => {
  const found = PALETTE.find((color) => color.name === name);
  if (!found) throw new Error(`No palette color called ${name}`);
  return found.hex;
};

const outfit = (names: Partial<Record<CheckSlot, string>>): WornPieces =>
  Object.fromEntries(Object.entries(names).map(([slot, name]) => [slot, hex(name)]));

const CLASSIC = outfit({ outerwear: 'Navy', top: 'Cream', bottom: 'Charcoal', shoes: 'Brown' });
const COLORFUL_BOTTOM = outfit({
  outerwear: 'Camel',
  top: 'Cream',
  bottom: 'Mustard',
  shoes: 'Rust',
});
const COLORFUL_MIXED = outfit({ outerwear: 'Denim', top: 'Mustard', bottom: 'Rust' });
const MIXED_QUIET = outfit({ top: 'Denim', bottom: 'Grey', shoes: 'Rust' });
const NEUTRAL = outfit({ outerwear: 'Black', top: 'White', bottom: 'Charcoal', shoes: 'Black' });
const TONAL = outfit({ outerwear: 'Navy', bottom: 'Charcoal', shoes: 'Black' });
const TIE = outfit({ top: 'Navy', bottom: 'Navy' });
const TWIN_BLACK = outfit({ top: 'Black', bottom: 'Black' });

const ALL = {
  CLASSIC,
  COLORFUL_BOTTOM,
  COLORFUL_MIXED,
  MIXED_QUIET,
  NEUTRAL,
  TONAL,
  TIE,
  TWIN_BLACK,
};

/** The observations, asserted non-null: every fixture here has at least two pieces. */
const check = (pieces: WornPieces): Observation[] => {
  const result = checkOutfit(pieces);
  if (!result) throw new Error('Expected observations');
  return result;
};

const find = (observations: Observation[], term: Observation['term']) =>
  observations.find((o) => o.term === term);
const slots = (o: Observation | undefined) => o?.pieces.map((piece) => piece.slot);

describe('the fixtures', () => {
  // If a retune moves the budget past one of these, the tests below fail for
  // a reason that has nothing to do with checkOutfit. This says so first.
  it('sit where the tests below assume', () => {
    expect(chromaLoad(CLASSIC)).toBeLessThanOrEqual(TUNING.chromaBudget);
    expect(chromaLoad(MIXED_QUIET)).toBeLessThanOrEqual(TUNING.chromaBudget);
    expect(chromaLoad(COLORFUL_BOTTOM)).toBeGreaterThan(TUNING.chromaBudget);
    expect(chromaLoad(COLORFUL_MIXED)).toBeGreaterThan(TUNING.chromaBudget);
  });
});

describe('checkOutfit', () => {
  it('returns null under two pieces', () => {
    expect(checkOutfit({})).toBeNull();
    expect(checkOutfit({ top: hex('Navy') })).toBeNull();
    // The type forbids an explicit undefined, but an object built at runtime
    // from the session can still carry one.
    expect(
      checkOutfit({ top: hex('Navy'), bottom: undefined } as unknown as WornPieces),
    ).toBeNull();
  });

  it('checks two pieces', () => {
    expect(checkOutfit(TIE)).not.toBeNull();
  });

  it('says color, then warm and cool, then light and dark', () => {
    expect(check(CLASSIC).map((o) => o.term)).toEqual(['color', 'temperature', 'lightness']);
    expect(check(NEUTRAL).map((o) => o.term)).toEqual(['color', 'lightness']);
  });

  it('names the piece carrying the color in a quiet outfit', () => {
    const color = find(check(CLASSIC), 'color');
    expect(color).toMatchObject({ kind: 'quiet' });
    expect(slots(color)).toEqual(['outerwear']);
  });

  it('names the piece carrying most of the color in a colorful outfit', () => {
    const color = find(check(COLORFUL_BOTTOM), 'color');
    expect(color).toMatchObject({ kind: 'colorful' });
    expect(slots(color)).toEqual(['bottom']);
    expect(slots(find(check(COLORFUL_MIXED), 'color'))).toEqual(['top']);
  });

  it('calls an outfit of neutrals neutral, naming no piece', () => {
    expect(find(check(NEUTRAL), 'color')).toEqual({ term: 'color', kind: 'neutral', pieces: [] });
  });

  it('says when every colored piece is warm', () => {
    const temperature = find(check(COLORFUL_BOTTOM), 'temperature');
    expect(temperature).toMatchObject({ kind: 'warm' });
    expect(slots(temperature)).toEqual(['outerwear', 'top', 'bottom', 'shoes']);
  });

  it('says when every colored piece is cool', () => {
    expect(find(check(TIE), 'temperature')).toMatchObject({ kind: 'cool' });
  });

  // Cream is faint, but it is warm, and a description has no reason to
  // discount it the way the engine's temperature penalty does.
  it('names the heaviest warm and cool piece when both are there', () => {
    const classic = find(check(CLASSIC), 'temperature');
    expect(classic).toMatchObject({ kind: 'mixed' });
    expect(slots(classic)).toEqual(['top', 'outerwear']);
    expect(slots(find(check(MIXED_QUIET), 'temperature'))).toEqual(['shoes', 'top']);
    expect(slots(find(check(COLORFUL_MIXED), 'temperature'))).toEqual(['top', 'outerwear']);
  });

  it('says nothing about warm and cool with fewer than two colored pieces', () => {
    expect(find(check(NEUTRAL), 'temperature')).toBeUndefined();
    expect(find(check(TONAL), 'temperature')).toBeUndefined();
  });

  it('names the lightest and darkest piece when they are far apart', () => {
    const lightness = find(check(NEUTRAL), 'lightness');
    expect(lightness).toMatchObject({ kind: 'contrast' });
    // Two black pieces: the jacket is higher up, so it is the one named.
    expect(slots(lightness)).toEqual(['top', 'outerwear']);
  });

  it('reads pieces close in lightness as tonal', () => {
    const lightness = find(check(TONAL), 'lightness');
    expect(lightness).toMatchObject({ kind: 'tonal' });
    expect(slots(lightness)).toEqual(['outerwear', 'bottom', 'shoes']);
  });

  it('breaks ties head to toe', () => {
    expect(slots(find(check(TIE), 'color'))).toEqual(['top']);
  });

  it('reads a single-color outfit as calm', () => {
    const observations = check(TWIN_BLACK);
    expect(find(observations, 'color')).toMatchObject({ kind: 'neutral' });
    expect(find(observations, 'lightness')).toMatchObject({ kind: 'tonal' });
    expect(find(observations, 'temperature')).toBeUndefined();
  });

  it('only ever names pieces that are worn', () => {
    for (const [name, pieces] of Object.entries(ALL)) {
      for (const o of check(pieces)) {
        for (const piece of o.pieces) {
          expect(Object.keys(pieces), name).toContain(piece.slot);
          expect(piece.hex, name).toBe(pieces[piece.slot]);
        }
      }
    }
  });
});
