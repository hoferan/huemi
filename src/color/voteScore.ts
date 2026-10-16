import type { PairVote } from '../model/field';
import type { Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { rate } from './engine';

/**
 * Scores the engine against the yes/no votes on color pairs that the guided
 * matching run records. Pure functions over the merged votes, so the
 * benchmark prints and the tests can assert.
 */

/**
 * The chance a random positive outscores a random negative, by rank sum. A tie
 * counts half: tied scores share their average rank. Needs a positive and a
 * negative; the caller decides what an empty side means.
 */
export function aucByRank(positives: number[], negatives: number[]): number {
  const rows = [
    ...positives.map((score) => ({ score, positive: true })),
    ...negatives.map((score) => ({ score, positive: false })),
  ].sort((a, b) => a.score - b.score);

  let rankSum = 0;
  for (let i = 0; i < rows.length;) {
    let end = i;
    while (end < rows.length && rows[end]!.score === rows[i]!.score) end += 1;
    // Ranks are 1-based, so the run i..end-1 shares the mean of i+1..end.
    const shared = (i + 1 + end) / 2;
    for (let k = i; k < end; k += 1) if (rows[k]!.positive) rankSum += shared;
    i = end;
  }
  const p = positives.length;
  return (rankSum - (p * (p + 1)) / 2) / (p * negatives.length);
}

/** How the engine rates a top and bottom together: the bottom against the top. */
const rateTogether = (vote: PairVote): number => rate(vote.top, vote.bottom, 'bottom', 'top');

export function pairAuc(votes: readonly PairVote[]): {
  liked: number;
  disliked: number;
  auc: number | null;
} {
  const liked = votes.filter((vote) => vote.liked).map(rateTogether);
  const disliked = votes.filter((vote) => !vote.liked).map(rateTogether);
  const auc = liked.length && disliked.length ? aucByRank(liked, disliked) : null;
  return { liked: liked.length, disliked: disliked.length, auc };
}

/** The slot the swap changed, the one it kept, and the colors on each. */
function swapSides(vote: PairVote): { slot: Slot; keptSlot: Slot; kept: Hex; replaced: Hex } {
  return vote.changed === 'top'
    ? { slot: 'top', keptSlot: 'bottom', kept: vote.bottom, replaced: vote.top }
    : { slot: 'bottom', keptSlot: 'top', kept: vote.top, replaced: vote.bottom };
}

/**
 * Where people's swaps agree with the engine. Over the votes that chose a
 * replacement, `preferred` counts those where the engine rates the replacement
 * above the color it replaced, against the block that stayed. `meanRank` is
 * the replacement's mean 1-based place among the colors offered, ranked by the
 * same rating, best first.
 */
export function swapAgreement(votes: readonly PairVote[]): {
  swaps: number;
  preferred: number;
  meanRank: number | null;
} {
  let swaps = 0;
  let preferred = 0;
  const ranks: number[] = [];

  for (const vote of votes) {
    if (!vote.replacement || !vote.changed) continue;
    swaps += 1;
    const { slot, keptSlot, kept, replaced } = swapSides(vote);
    const score = (hex: Hex) => rate(kept, hex, slot, keptSlot);
    const chosen = score(vote.replacement);
    if (chosen > score(replaced)) preferred += 1;

    // A replacement missing from `offered` has no rank, so it stays out of the
    // mean rather than counting as last.
    if (!vote.offered.includes(vote.replacement)) continue;
    ranks.push(1 + vote.offered.filter((hex) => score(hex) > chosen).length);
  }

  const meanRank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;
  return { swaps, preferred, meanRank };
}

export function voteReport(votes: readonly PairVote[]): string {
  const { liked, disliked, auc } = pairAuc(votes);
  const { swaps, preferred, meanRank } = swapAgreement(votes);
  return [
    `Pair votes: ${votes.length} vote${votes.length === 1 ? '' : 's'}, ${liked} liked, ${disliked} disliked`,
    auc === null
      ? 'Pair AUC: needs a liked and a disliked vote'
      : `Pair AUC: ${auc.toFixed(3)} (0.5 is chance)`,
    swaps === 0
      ? 'Swaps: none'
      : `Swaps: ${swaps}, the engine rated the replacement above the replaced color in ${preferred}` +
        (meanRank === null ? '' : `, mean rank ${meanRank.toFixed(2)} among the offered colors`),
  ].join('\n');
}
