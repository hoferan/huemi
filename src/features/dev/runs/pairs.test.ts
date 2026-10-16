import { describe, expect, it } from 'vitest';
import { isNearDuplicate, rate, suggest } from '../../../color/engine';
import { PALETTE } from '../../../color/palette';
import { parseHex, type Hex } from '../../../model/hex';
import { drawPairs, replacementOptions, type Pair } from './pairs';

/** A small seeded generator, so a failing draw can be reproduced. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const score = (p: Pair) => rate(p.top, p.bottom, 'bottom', 'top');

/** Every candidate pair, ranked the way the module ranks them. */
function ranked(): Pair[] {
  const pairs: Pair[] = [];
  for (const top of PALETTE) {
    for (const bottom of PALETTE) {
      if (top.hex === bottom.hex || isNearDuplicate(top.hex, bottom.hex)) continue;
      pairs.push({ top: top.hex, bottom: bottom.hex });
    }
  }
  return pairs.sort((a, b) => score(b) - score(a));
}

/** The third a pair falls in: 0 top, 1 middle, 2 bottom. */
function thirdOf(pair: Pair, all: Pair[]): number {
  const index = all.findIndex((p) => p.top === pair.top && p.bottom === pair.bottom);
  const base = Math.floor(all.length / 3);
  const extra = all.length % 3;
  const firstEnd = base + (extra > 0 ? 1 : 0);
  const secondEnd = firstEnd + base + (extra > 1 ? 1 : 0);
  return index < firstEnd ? 0 : index < secondEnd ? 1 : 2;
}

const key = (p: Pair) => `${p.top}|${p.bottom}`;

describe('drawPairs', () => {
  it('returns distinct pairs that are neither equal nor near-duplicates', () => {
    const pairs = drawPairs(20, mulberry32(1));
    expect(pairs).toHaveLength(20);
    expect(new Set(pairs.map(key)).size).toBe(20);
    for (const { top, bottom } of pairs) {
      expect(top).not.toBe(bottom);
      expect(isNearDuplicate(top, bottom)).toBe(false);
    }
  });

  it.each([
    [10, [4, 3, 3]],
    [20, [7, 7, 6]],
    [30, [10, 10, 10]],
  ] as const)('takes %i pairs in shares of %j from the three thirds', (count, shares) => {
    const all = ranked();
    const counts = [0, 0, 0];
    for (const pair of drawPairs(count, mulberry32(7))) counts[thirdOf(pair, all)]! += 1;
    expect(counts).toEqual(shares);
  });

  it('does not hand the pairs back ordered by score', () => {
    for (const seed of [3, 11]) {
      const pairs = drawPairs(30, mulberry32(seed));
      const scores = pairs.map(score);
      const sorted = [...scores].sort((a, b) => b - a);
      expect(scores).not.toEqual(sorted);
    }
  });
});

describe('replacementOptions', () => {
  const navy = parseHex('#1f2a44');
  const cream = parseHex('#e9dfc9');

  it.each([
    ['top', 'bottom'],
    ['bottom', 'top'],
  ] as const)(
    'offers three engine picks and three others when keeping the %s',
    (keepSlot, otherSlot) => {
      const options = replacementOptions(navy, keepSlot, cream, mulberry32(5));
      expect(options).toHaveLength(6);
      expect(new Set(options).size).toBe(6);
      const picks = suggest(navy, otherSlot, keepSlot)
        .map((s) => s.hex)
        .filter((hex) => !isNearDuplicate(navy, hex) && !isNearDuplicate(cream, hex))
        .slice(0, 3);
      for (const pick of picks) expect(options).toContain(pick);
      const others = options.filter((hex: Hex) => !picks.includes(hex));
      expect(others).toHaveLength(3);
      for (const hex of options) {
        expect(isNearDuplicate(navy, hex)).toBe(false);
        expect(isNearDuplicate(cream, hex)).toBe(false);
      }
    },
  );
});
