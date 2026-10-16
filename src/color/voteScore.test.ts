import { describe, expect, it } from 'vitest';
import type { PairVote } from '../model/field';
import type { Hex } from '../model/hex';
import { rate } from './engine';
import { PALETTE } from './palette';
import { aucByRank, pairAuc, swapAgreement, voteReport } from './voteScore';

const color = (name: string): Hex => PALETTE.find((c) => c.name === name)!.hex;

const vote = (over: Partial<PairVote>): PairVote => ({
  id: 'v',
  takenAt: '2026-10-16T10:00:00.000Z',
  build: 'test',
  top: color('Navy'),
  bottom: color('Cream'),
  liked: true,
  changed: null,
  replacement: null,
  offered: [],
  noneWorks: false,
  ...over,
});

const pairRate = (top: string, bottom: string) => rate(color(top), color(bottom), 'bottom', 'top');

describe('aucByRank', () => {
  it('is 1 when every positive outscores every negative', () => {
    expect(aucByRank([3, 4], [1, 2])).toBe(1);
  });

  it('is 0 when every negative outscores every positive', () => {
    expect(aucByRank([1, 2], [3, 4])).toBe(0);
  });

  it('counts a tie as half', () => {
    expect(aucByRank([1], [1])).toBe(0.5);
    expect(aucByRank([2, 1], [1, 0])).toBeCloseTo(0.875);
  });
});

describe('pairAuc', () => {
  // Setup relies on the engine's own ordering, so assert it first.
  const good = ['Navy', 'Black'] as const;
  const bad = ['Denim', 'Peach'] as const;
  it('has a pairing the engine rates higher than another', () => {
    expect(pairRate(...good)).toBeGreaterThan(pairRate(...bad));
  });

  const make = (liked: boolean, pair: readonly [string, string]) =>
    vote({ top: color(pair[0]), bottom: color(pair[1]), liked });

  it('is 1 when the liked pairs are the ones the engine rates high', () => {
    const votes = [make(true, good), make(true, good), make(false, bad), make(false, bad)];
    expect(pairAuc(votes)).toEqual({ liked: 2, disliked: 2, auc: 1 });
  });

  it('is 0 with the labels reversed', () => {
    const votes = [make(false, good), make(false, good), make(true, bad), make(true, bad)];
    expect(pairAuc(votes).auc).toBe(0);
  });

  it('is null when one side is empty', () => {
    expect(pairAuc([make(true, good)])).toEqual({ liked: 1, disliked: 0, auc: null });
    expect(pairAuc([make(false, good)])).toEqual({ liked: 0, disliked: 1, auc: null });
    expect(pairAuc([]).auc).toBeNull();
  });
});

describe('swapAgreement', () => {
  const keptBottom = color('Cream');
  const replaced = color('Mustard');

  // Rate every candidate top against the kept bottom, as the function must.
  const ranked = PALETTE.map((c) => c.hex)
    .filter((hex) => hex !== keptBottom)
    .sort((a, b) => rate(keptBottom, b, 'top', 'bottom') - rate(keptBottom, a, 'top', 'bottom'));
  const best = ranked[0]!;
  const worst = ranked[ranked.length - 1]!;

  it('prefers a replacement the engine rates above the replaced color', () => {
    expect(rate(keptBottom, best, 'top', 'bottom')).toBeGreaterThan(
      rate(keptBottom, replaced, 'top', 'bottom'),
    );
    const v = vote({
      top: replaced,
      bottom: keptBottom,
      liked: false,
      changed: 'top',
      replacement: best,
      offered: [worst, best],
    });
    expect(swapAgreement([v])).toEqual({ swaps: 1, preferred: 1, meanRank: 1 });
  });

  it('rates a changed top as the top against the kept bottom', () => {
    // With the worst color as the replacement the engine disagrees, and the
    // rank is its place among the offers.
    const v = vote({
      top: replaced,
      bottom: keptBottom,
      liked: false,
      changed: 'top',
      replacement: worst,
      offered: [best, worst],
    });
    expect(swapAgreement([v])).toEqual({ swaps: 1, preferred: 0, meanRank: 2 });
  });

  it('rates a changed bottom as the bottom against the kept top', () => {
    const keptTop = color('Navy');
    const ranking = PALETTE.map((c) => c.hex).sort(
      (a, b) => rate(keptTop, b, 'bottom', 'top') - rate(keptTop, a, 'bottom', 'top'),
    );
    const v = vote({
      top: keptTop,
      bottom: replaced,
      liked: false,
      changed: 'bottom',
      replacement: ranking[0]!,
      offered: [ranking[ranking.length - 1]!, ranking[0]!],
    });
    expect(swapAgreement([v])).toEqual({ swaps: 1, preferred: 1, meanRank: 1 });
  });

  it('ignores votes without a replacement, and leaves a replacement outside the offers out of the rank', () => {
    const none = vote({ liked: true });
    const stray = vote({
      top: replaced,
      bottom: keptBottom,
      changed: 'top',
      replacement: best,
      offered: [worst],
    });
    expect(swapAgreement([none])).toEqual({ swaps: 0, preferred: 0, meanRank: null });
    expect(swapAgreement([stray])).toMatchObject({ swaps: 1, meanRank: null });
  });
});

describe('voteReport', () => {
  it('summarises both measures', () => {
    const text = voteReport([vote({ liked: true }), vote({ liked: false })]);
    expect(text).toContain('2 votes');
    expect(text).toMatch(/AUC/);
  });

  it('says what is missing when there is nothing to measure', () => {
    expect(voteReport([vote({ liked: true })])).toBe(
      [
        'Pair votes: 1 vote, 1 liked, 0 disliked',
        'Pair AUC: needs a liked and a disliked vote',
        'Swaps: none',
      ].join('\n'),
    );
  });

  it('leaves out the mean rank when no replacement was among the offered colors', () => {
    const text = voteReport([
      vote({ liked: false, changed: 'bottom', replacement: color('Black'), offered: [] }),
    ]);
    expect(text).toMatch(
      /^Swaps: 1, the engine rated the replacement above the replaced color in [01]$/m,
    );
  });
});
