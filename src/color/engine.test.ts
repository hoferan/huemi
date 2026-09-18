import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { PALETTE } from './palette';

import { byScoreThenName, rate, suggest } from './engine';

const NAVY = parseHex('#1f2a44');
const RUST = parseHex('#a4522d');
const WHITE = parseHex('#f7f6f3');

const names = (base: Hex = NAVY, slot: Slot = 'top', baseSlot: Slot = 'bottom') =>
  suggest(base, slot, baseSlot).map((s) => s.name);

const rankOf = (name: string, ...args: Parameters<typeof names>) => names(...args).indexOf(name);

describe('suggest', () => {
  it('returns the whole palette for a slot other than the base slot', () => {
    expect(names()).toHaveLength(PALETTE.length);
  });

  it('labels every suggestion with the slot it was asked for', () => {
    for (const suggestion of suggest(NAVY, 'shoes', 'bottom')) {
      expect(suggestion.slot).toBe('shoes');
    }
  });

  it('names every suggestion as the palette names it', () => {
    const palette = new Map(PALETTE.map((c) => [c.hex, c.name]));
    for (const suggestion of suggest(NAVY, 'top', 'bottom')) {
      expect(suggestion.name).toBe(palette.get(suggestion.hex));
    }
  });

  it('keeps the base color as a candidate for a different slot', () => {
    expect(names()).toContain('Navy');
  });

  it('drops the base color from its own slot, which is already locked', () => {
    expect(names(NAVY, 'bottom', 'bottom')).not.toContain('Navy');
  });

  it('returns the same order twice', () => {
    expect(names()).toEqual(names());
  });
});

describe('rate, on lightness alone', () => {
  // Greys throughout, so hue and temperature hold still and only the lightness
  // term moves. Gaps from #1b1b1b are 0.055, 0.253 and 0.444.
  const BLACK = parseHex('#1b1b1b');
  const TONAL = parseHex('#282828');
  const MIDDLE = parseHex('#5c5c5c');
  const WIDE = parseHex('#949494');
  const score = (hex: Hex) => rate(BLACK, hex, 'top', 'bottom');

  it('prefers a tonal pairing to a middling gap', () => {
    // Across 17,316 Polyvore outfits, real pairs run 1.63 times as common as
    // random ones at a near-zero gap and 0.81 at a middling one. The shipped
    // ramp had this backwards. See ADR 0010.
    expect(score(TONAL)).toBeGreaterThan(score(MIDDLE));
  });

  it('still prefers a middling gap to the widest one', () => {
    // The dip above the peak is real but mild, 0.81 against 0.71, so this is
    // an ordering and not a veto. It is what keeps a band from becoming the
    // ramp's mirror image and ranking navy with white last.
    expect(score(MIDDLE)).toBeGreaterThan(score(WIDE));
  });
});

describe('suggest, aiming at a middle band', () => {
  it('does not lead with the base color repeated', () => {
    expect(suggest(NAVY, 'top', 'bottom')[0]!.name).not.toBe('Navy');
  });

  it('leaves the base color repeated in the bottom third, as the matchy extreme', () => {
    const ranked = names();
    expect(ranked.indexOf('Navy')).toBeGreaterThan((ranked.length * 2) / 3);
  });

  it('ranks a mid-contrast color above the base color repeated', () => {
    expect(rankOf('Cream')).toBeLessThan(rankOf('Navy'));
  });

  it('does not bury a high-contrast classic', () => {
    // Navy with white. The tonal peak is what real outfits cluster on, but the
    // dip above it is mild (0.81 against 0.71 in ADR 0010's lift table), so a
    // wide gap has to stay respectable rather than sink. An earlier draft with
    // a floor under the band inverted the old ramp and ranked this last.
    const ranked = names();
    expect(ranked.indexOf('White')).toBeLessThan((ranked.length * 2) / 3);
  });
});

describe('suggest, weighting by slot area', () => {
  it('ranks a saturated color higher as an accessory than as outerwear', () => {
    // Scores rather than ranks. Mustard sits near the bottom of both lists, so
    // comparing positions reads equal whatever the area weighting does, which
    // is coverage in name only.
    const mustard = parseHex('#c39a3a');
    expect(rate(NAVY, mustard, 'accessory', 'bottom')).toBeGreaterThan(
      rate(NAVY, mustard, 'outerwear', 'bottom'),
    );
  });

  it('leaves a neutral near enough where it was between those slots', () => {
    const asAccessory = rankOf('Light grey', NAVY, 'accessory', 'bottom');
    const asOuterwear = rankOf('Light grey', NAVY, 'outerwear', 'bottom');
    expect(Math.abs(asAccessory - asOuterwear)).toBeLessThanOrEqual(2);
  });
});

describe('suggest, leaning on neutrals', () => {
  it('puts a neutral in the top three for a saturated base', () => {
    const top3 = names(RUST, 'top', 'bottom').slice(0, 3);
    const neutrals = ['Black', 'Charcoal', 'Grey', 'Light grey', 'White'];
    expect(top3.some((name) => neutrals.includes(name))).toBe(true);
  });

  it('does not rank a clashing saturated color above every neutral', () => {
    const ranked = names(RUST, 'top', 'bottom');
    const bestNeutral = Math.min(
      ...['Black', 'Charcoal', 'Grey', 'Light grey', 'White'].map((n) => ranked.indexOf(n)),
    );
    expect(bestNeutral).toBeLessThan(ranked.indexOf('Burgundy'));
  });
});

describe('suggest, reading the candidate as the figure', () => {
  it('does not collapse to the hues nearest the base', () => {
    const ranked = suggest(WHITE, 'top', 'bottom');
    expect(ranked[0]!.name).not.toBe('Light grey');
  });
});

describe('byScoreThenName', () => {
  const ranked = (name: string, score: number) => ({
    suggestion: { hex: parseHex('#1b1b1b'), name, slot: 'top' as Slot },
    score,
  });

  it('puts the higher score first, whatever the names are', () => {
    expect(byScoreThenName(ranked('Zinc', 2), ranked('Amber', 1))).toBeLessThan(0);
    expect(byScoreThenName(ranked('Amber', 1), ranked('Zinc', 2))).toBeGreaterThan(0);
  });

  it('breaks a tie on name, so the order never follows the palette order', () => {
    expect(byScoreThenName(ranked('Rust', 1), ranked('Cream', 1))).toBeGreaterThan(0);
    expect(byScoreThenName(ranked('Cream', 1), ranked('Rust', 1))).toBeLessThan(0);
  });

  it('is zero only when both agree', () => {
    expect(byScoreThenName(ranked('Rust', 1), ranked('Rust', 1))).toBe(0);
  });
});
