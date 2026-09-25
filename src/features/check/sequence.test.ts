import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { tapOutcome } from './sequence';

const navy = parseHex('#1f2a44');
const white = parseHex('#f7f6f3');

describe('tapOutcome', () => {
  it('fills the slot with a plain reading, carried as the read', () => {
    const outcome = tapOutcome({ kind: 'single', color: navy });
    expect(outcome).toEqual({ kind: 'set', hex: navy, read: navy });
  });

  // The list is where a pattern gets corrected, so the tap step never stops
  // to ask which of its colors was meant, and the piece carries no read: a
  // change there would be no correction, as it is not one for `several` on
  // the confirm screen either.
  it('fills the slot with the largest color of a pattern, with no read to correct', () => {
    const outcome = tapOutcome({
      kind: 'several',
      colors: [
        { color: navy, share: 0.6 },
        { color: white, share: 0.4 },
      ],
    });
    expect(outcome).toEqual({ kind: 'set', hex: navy });
    expect(outcome).not.toHaveProperty('read');
  });

  it('asks again when the tap read nothing clear', () => {
    expect(tapOutcome({ kind: 'unclear' })).toEqual({ kind: 'retry' });
  });
});
