import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { initialSession, sessionReducer } from './reducer';

const navy = parseHex('#1f2a44');
const cream = parseHex('#e9dfc9');

describe('sessionReducer', () => {
  it('records the base colour and the slot it came from', () => {
    const next = sessionReducer(initialSession, { type: 'baseChosen', slot: 'bottom', hex: navy });
    expect(next.base).toEqual({ slot: 'bottom', hex: navy });
  });

  it('clears picks and locks when a new base is chosen', () => {
    const withWork = sessionReducer(
      sessionReducer(
        sessionReducer(initialSession, { type: 'baseChosen', slot: 'bottom', hex: navy }),
        { type: 'pickChanged', slot: 'top', hex: cream, cursor: 0 },
      ),
      { type: 'lockToggled', slot: 'top' },
    );
    const next = sessionReducer(withWork, { type: 'baseChosen', slot: 'top', hex: cream });
    expect(next.picks).toEqual({});
    expect(next.locked).toEqual({});
    expect(next.cursor).toEqual({});
  });

  it('returns to the initial state on reset', () => {
    const withBase = sessionReducer(initialSession, {
      type: 'baseChosen',
      slot: 'bottom',
      hex: navy,
    });
    expect(sessionReducer(withBase, { type: 'reset' })).toEqual(initialSession);
  });
});
