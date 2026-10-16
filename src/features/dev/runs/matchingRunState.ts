import type { PairVote } from '../../../model/field';
import type { Hex } from '../../../model/hex';
import type { Pair } from './pairs';

type Run = { pairs: Pair[]; votes: PairVote[] };

/**
 * The matching run's steps. The current pair is `pairs[votes.length]`, so the
 * run's place is the number of votes and nothing else keeps count. `replace`
 * carries the block the person would change and the six colors offered for it,
 * drawn once when they picked the block so a re-render never reshuffles them.
 */
export type MatchingState =
  | { step: 'setup' }
  | ({ step: 'vote' | 'which' | 'summary' } & Run)
  | ({ step: 'replace'; changed: 'top' | 'bottom'; offered: Hex[] } & Run);

export type MatchingAction =
  | { type: 'start'; pairs: Pair[] }
  | { type: 'no' }
  | { type: 'pick'; changed: 'top' | 'bottom'; offered: Hex[] }
  | { type: 'voted'; vote: PairVote }
  | { type: 'undo' }
  | { type: 'again' };

/**
 * The matching run's steps. As in the reading run, the screen does the saving:
 * `voted` arrives only once the store has the vote, and Undo arrives only once
 * it has deleted one, so the run never counts a vote the set does not have.
 * Yes is therefore no step of its own. An action a step has no use for leaves
 * the state alone.
 */
export function matchingRun(state: MatchingState, action: MatchingAction): MatchingState {
  switch (action.type) {
    case 'start':
      if (state.step !== 'setup') return state;
      return { step: 'vote', pairs: action.pairs, votes: [] };
    case 'no':
      if (state.step !== 'vote') return state;
      return { step: 'which', pairs: state.pairs, votes: state.votes };
    case 'pick':
      if (state.step !== 'which') return state;
      return {
        step: 'replace',
        pairs: state.pairs,
        votes: state.votes,
        changed: action.changed,
        offered: action.offered,
      };
    case 'voted': {
      if (state.step !== 'vote' && state.step !== 'replace') return state;
      const { pairs } = state;
      const votes = [...state.votes, action.vote];
      return { step: votes.length === pairs.length ? 'summary' : 'vote', pairs, votes };
    }
    case 'undo': {
      // Offered on a pair's first question and on the summary, never halfway
      // through a No, where the vote to take back is not the one on screen.
      if (state.step !== 'vote' && state.step !== 'summary') return state;
      if (state.votes.length === 0) return state;
      return { step: 'vote', pairs: state.pairs, votes: state.votes.slice(0, -1) };
    }
    case 'again':
      return state.step === 'summary' ? { step: 'setup' } : state;
  }
}
