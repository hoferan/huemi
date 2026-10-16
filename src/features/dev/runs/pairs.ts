import { isNearDuplicate, rate, suggest } from '../../../color/engine';
import { PALETTE } from '../../../color/palette';
import type { Hex } from '../../../model/hex';
import type { Slot } from '../../../model/types';

export type Pair = { top: Hex; bottom: Hex };

/** How many replacement swatches come from the engine, and how many from chance. */
const ENGINE_PICKS = 3;
const RANDOM_PICKS = 3;

/** Fisher-Yates, in place. */
function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** `count` items chosen without replacement. */
function sample<T>(items: readonly T[], count: number, random: () => number): T[] {
  return shuffle([...items], random).slice(0, count);
}

/**
 * Splits `total` into three shares that differ by at most one, the larger
 * ones first. Used for both the size of each third of the ranking and the
 * number of pairs taken from each, so 10 gives 4, 3, 3 and 20 gives 7, 7, 6.
 */
function thirds(total: number): [number, number, number] {
  const base = Math.floor(total / 3);
  const extra = total % 3;
  return [base + (extra > 0 ? 1 : 0), base + (extra > 1 ? 1 : 0), base];
}

/** Every ordered top and bottom pair from the palette that is not a near-duplicate. */
function candidates(): Pair[] {
  const pairs: Pair[] = [];
  for (const top of PALETTE) {
    for (const bottom of PALETTE) {
      if (top.hex === bottom.hex || isNearDuplicate(top.hex, bottom.hex)) continue;
      pairs.push({ top: top.hex, bottom: bottom.hex });
    }
  }
  return pairs;
}

/**
 * Pairs for the matching run to ask about.
 *
 * Votes are only informative if they cover the whole range of what the engine
 * rates, so the candidates are ranked and cut into a top, middle and bottom
 * third, and the run takes an even share from each. The candidate total is
 * rarely divisible by three; the leftover pairs go to the top third, then the
 * middle one, with the same rule that spreads the run's own count. The result
 * is shuffled so the person cannot tell which third a pair came from.
 */
export function drawPairs(count: 10 | 20 | 30, random: () => number = Math.random): Pair[] {
  const ranked = candidates()
    .map((pair) => ({ pair, score: rate(pair.top, pair.bottom, 'bottom', 'top') }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.pair);

  const sizes = thirds(ranked.length);
  const shares = thirds(count);
  const drawn: Pair[] = [];
  let start = 0;
  sizes.forEach((size, i) => {
    drawn.push(...sample(ranked.slice(start, start + size), shares[i]!, random));
    start += size;
  });
  return shuffle(drawn, random);
}

/**
 * Six swatches to replace one block with, the other block being kept.
 *
 * Three are the engine's best picks for the replaced slot and three are random
 * palette colors, so a vote on them says whether the engine's favorites beat
 * chance. Colors too close to the kept block are left out of both groups, and
 * a random color never repeats an engine pick. The replaced block's current
 * color is not known here, so only the kept one is excluded. The six are
 * shuffled so position gives nothing away.
 */
export function replacementOptions(
  keep: Hex,
  keepSlot: Slot,
  random: () => number = Math.random,
): Hex[] {
  const otherSlot: Slot = keepSlot === 'top' ? 'bottom' : 'top';
  const picks = suggest(keep, otherSlot, keepSlot)
    .map((s) => s.hex)
    .filter((hex) => !isNearDuplicate(keep, hex))
    .slice(0, ENGINE_PICKS);
  const pool = PALETTE.map((c) => c.hex).filter(
    (hex) => !isNearDuplicate(keep, hex) && !picks.includes(hex),
  );
  return shuffle([...picks, ...sample(pool, RANDOM_PICKS, random)], random);
}
