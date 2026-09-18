import { describe, expect, it } from 'vitest';
import { suggest } from '../color/engine';
import { parseHex } from '../model/hex';
import { advance, locate, positionLabel } from './select';

const base = { slot: 'bottom', hex: parseHex('#1f2a44') } as const;
const list = suggest(base.hex, 'top', base.slot);

describe('advance', () => {
  it('lands on the best suggestion from a cursor of zero', () => {
    const first = list[0];
    expect(first).toBeDefined();
    expect(advance(base, 'top', 0, 0)).toEqual({
      hex: first?.hex,
      cursor: 0,
      count: list.length,
    });
  });

  it('steps to the next suggestion', () => {
    expect(advance(base, 'top', 0, 1).hex).toBe(list[1]?.hex);
  });

  it('wraps past the end of the list without losing the cursor', () => {
    const wrapped = advance(base, 'top', list.length - 1, 1);
    expect(wrapped.hex).toBe(list[0]?.hex);
    // The cursor keeps counting: the position label wraps, the cursor does not,
    // so stepping back returns to where the user was.
    expect(wrapped.cursor).toBe(list.length);
  });

  it('wraps backwards below zero', () => {
    const wrapped = advance(base, 'top', 0, -1);
    expect(wrapped.hex).toBe(list[list.length - 1]?.hex);
    expect(wrapped.cursor).toBe(-1);
  });
});

describe('locate', () => {
  it('finds where a colour sits in the list', () => {
    const third = list[2];
    expect(third).toBeDefined();
    if (!third) return;
    expect(locate(base, 'top', third.hex)).toEqual({
      hex: third.hex,
      cursor: 2,
      count: list.length,
    });
  });

  it('returns null for a colour the engine never suggests', () => {
    // A free-picker colour, not in the palette, so no suggestion list holds it.
    expect(locate(base, 'top', parseHex('#123456'))).toBeNull();
  });
});

describe('positionLabel', () => {
  it('counts from one', () => {
    expect(positionLabel(0, 18)).toBe('1 of 18');
  });

  it('wraps forwards and backwards', () => {
    expect(positionLabel(18, 18)).toBe('1 of 18');
    expect(positionLabel(-1, 18)).toBe('18 of 18');
  });

  it('says nothing about a position in an empty list', () => {
    expect(positionLabel(0, 0)).toBe('');
    expect(positionLabel(3, 0)).toBe('');
  });
});
