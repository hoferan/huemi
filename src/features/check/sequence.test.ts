import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { tapOutcome } from './sequence';

const navy = parseHex('#1f2a44');
const white = parseHex('#f7f6f3');

describe('tapOutcome', () => {
  it('fills the slot with a plain reading', () => {
    const outcome = tapOutcome({ kind: 'single', color: navy });
    expect(outcome).toEqual({ kind: 'set', hex: navy });
  });

  // The list is where a pattern gets corrected, so the tap step never stops
  // to ask which of its colors was meant.
  it('fills the slot with the largest color of a pattern', () => {
    const outcome = tapOutcome({
      kind: 'several',
      colors: [
        { color: navy, share: 0.6 },
        { color: white, share: 0.4 },
      ],
    });
    expect(outcome).toEqual({ kind: 'set', hex: navy });
  });

  it('asks again when the tap read nothing clear', () => {
    expect(tapOutcome({ kind: 'unclear' })).toEqual({ kind: 'retry' });
  });
});
