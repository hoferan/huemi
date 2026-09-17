import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { PALETTE } from './palette';

import { suggest } from './engine';

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

  it('ranks a neutral above a dark saturated clash, the other extreme', () => {
    expect(rankOf('Light grey')).toBeLessThan(rankOf('Burgundy'));
  });

  it('rewards separating a dark base from a light piece', () => {
    const ranked = names();
    expect(ranked.indexOf('White')).toBeLessThan(ranked.indexOf('Charcoal'));
  });
});

describe('suggest, weighting by slot area', () => {
  it('ranks a saturated color higher as an accessory than as outerwear', () => {
    const asAccessory = rankOf('Mustard', NAVY, 'accessory', 'bottom');
    const asOuterwear = rankOf('Mustard', NAVY, 'outerwear', 'bottom');
    expect(asAccessory).toBeLessThan(asOuterwear);
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
