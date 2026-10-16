import { describe, expect, it } from 'vitest';
import type { PairVote } from '../../../model/field';
import { parseHex } from '../../../model/hex';
import { matchingRun, type MatchingState } from './matchingRunState';
import type { Pair } from './pairs';

const NAVY = parseHex('#1f2a44');
const RUST = parseHex('#aa3322');
const CREAM = parseHex('#f5f0e1');

const pairs = (n: number): Pair[] => Array.from({ length: n }, () => ({ top: NAVY, bottom: RUST }));

const vote = (n: number, liked = true): PairVote => ({
  id: `v${n}`,
  takenAt: '2026-10-16T10:00:00.000Z',
  build: 'abc',
  top: NAVY,
  bottom: RUST,
  liked,
  changed: null,
  replacement: null,
  offered: [],
  noneWorks: false,
});

const started = matchingRun({ step: 'setup' }, { type: 'start', pairs: pairs(10) });

/** Answers `count` pairs with a Yes each, from the state given. */
function answered(state: MatchingState, count: number): MatchingState {
  let next = state;
  for (let n = 1; n <= count; n++) next = matchingRun(next, { type: 'voted', vote: vote(n) });
  return next;
}

describe('matchingRun', () => {
  it('starts on the first pair with no votes', () => {
    expect(started).toEqual({ step: 'vote', pairs: pairs(10), votes: [] });
  });

  it('ignores Start once a run is under way', () => {
    expect(matchingRun(started, { type: 'start', pairs: pairs(20) })).toBe(started);
  });

  it('appends a Yes and moves to the next pair', () => {
    const next = matchingRun(started, { type: 'voted', vote: vote(1) });
    expect(next).toEqual({ step: 'vote', pairs: pairs(10), votes: [vote(1)] });
  });

  it('asks which block after No, then for a replacement, then votes', () => {
    const which = matchingRun(started, { type: 'no' });
    expect(which).toEqual({ ...started, step: 'which' });
    const offered = [CREAM, RUST];
    const replace = matchingRun(which, { type: 'pick', changed: 'bottom', offered });
    expect(replace).toEqual({ ...started, step: 'replace', changed: 'bottom', offered });
    const next = matchingRun(replace, { type: 'voted', vote: vote(1, false) });
    expect(next).toEqual({ step: 'vote', pairs: pairs(10), votes: [vote(1, false)] });
  });

  it('ignores No, pick and voted on steps that have no use for them', () => {
    const which = matchingRun(started, { type: 'no' });
    expect(matchingRun(which, { type: 'no' })).toBe(which);
    expect(matchingRun(started, { type: 'pick', changed: 'top', offered: [] })).toBe(started);
    // A vote lands from the vote or the replace step, not from the question of which block.
    expect(matchingRun(which, { type: 'voted', vote: vote(1) })).toBe(which);
    const setup = { step: 'setup' } as const;
    expect(matchingRun(setup, { type: 'no' })).toBe(setup);
    expect(matchingRun(setup, { type: 'voted', vote: vote(1) })).toBe(setup);
  });

  it('goes back from which and from replace to the vote, saving nothing', () => {
    const which = matchingRun(started, { type: 'no' });
    expect(matchingRun(which, { type: 'back' })).toEqual(started);
    const replace = matchingRun(which, { type: 'pick', changed: 'top', offered: [CREAM] });
    expect(matchingRun(replace, { type: 'back' })).toEqual(started);
    expect(matchingRun(started, { type: 'back' })).toBe(started);
    const summary = answered(started, 10);
    expect(matchingRun(summary, { type: 'back' })).toBe(summary);
  });

  it('ends on the summary at the last vote', () => {
    const state = answered(started, 10);
    expect(state.step).toBe('summary');
    expect(state.step === 'summary' && state.votes).toHaveLength(10);
  });

  it('undoes from a vote back to the previous pair', () => {
    const two = answered(started, 2);
    expect(matchingRun(two, { type: 'undo' })).toEqual({
      step: 'vote',
      pairs: pairs(10),
      votes: [vote(1)],
    });
  });

  it('undoes from the summary back to the last pair', () => {
    const undone = matchingRun(answered(started, 10), { type: 'undo' });
    expect(undone.step).toBe('vote');
    expect(undone.step === 'vote' && undone.votes).toHaveLength(9);
  });

  it('ignores Undo with no votes, and on the steps that do not offer it', () => {
    expect(matchingRun(started, { type: 'undo' })).toBe(started);
    const which = matchingRun(answered(started, 1), { type: 'no' });
    expect(matchingRun(which, { type: 'undo' })).toBe(which);
    const setup = { step: 'setup' } as const;
    expect(matchingRun(setup, { type: 'undo' })).toBe(setup);
  });

  it('starts again from the summary only', () => {
    expect(matchingRun(answered(started, 10), { type: 'again' })).toEqual({ step: 'setup' });
    expect(matchingRun(started, { type: 'again' })).toBe(started);
  });
});
