import { describe, expect, it } from 'vitest';
import { suggest, TUNING } from '../color/engine';
import { chroma } from '../color/classify';
import { colorName } from '../color/palette';
import { chromaLoad } from '../color/score';
import { parseHex, type Hex } from '../model/hex';
import { SLOTS, type Slot } from '../model/types';
import { advance, checkedPieces, composeOutfit, locate, positionLabel } from './select';
import type { Base, SlotPick } from './types';

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

describe('composeOutfit', () => {
  const base: Base = { slot: 'top', hex: parseHex('#c39a3a') };

  it('gives every slot a colour the outfit does not already show', () => {
    const picks = composeOutfit(base, {}, () => 0);
    const names = SLOTS.filter((slot) => slot !== base.slot).map((slot) =>
      colorName(picks[slot]!.hex),
    );
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain(colorName(base.hex));
  });

  it('keeps the outfit inside the chroma budget when the base leaves room', () => {
    const picks = composeOutfit(base, {}, () => 0);
    const pieces = { [base.slot]: base.hex } as Partial<Record<Slot, Hex>>;
    for (const slot of SLOTS) {
      const pick = picks[slot];
      if (pick) pieces[slot] = pick.hex;
    }
    expect(chromaLoad(pieces)).toBeLessThanOrEqual(TUNING.chromaBudget);
  });

  // A chromatic colour in a large slot can exceed the budget on its own, and
  // then no candidate can bring the outfit back under it. The fallback has to
  // pick the quietest colour available rather than the highest-ranked one.
  it('falls back to the lowest chroma when the base is already over budget', () => {
    const loud: Base = { slot: 'top', hex: parseHex('#a3231f') };
    const picks = composeOutfit(loud, {}, () => 0);
    // The candidate pool shrinks as it goes: each slot's colour takes its name
    // out of play for the slots after it. So the comparison has to be against
    // what was still available at that point, not against the whole list.
    const used = new Set([colorName(loud.hex)]);
    for (const slot of SLOTS) {
      if (slot === loud.slot) continue;
      const chosen = picks[slot]!.hex;
      const available = suggest(loud.hex, slot, loud.slot).filter(
        (entry) => !used.has(colorName(entry.hex)),
      );
      const cheapest = Math.min(...available.map((entry) => chroma(entry.hex)));
      expect(chroma(chosen)).toBeCloseTo(cheapest, 5);
      used.add(colorName(chosen));
    }
  });

  it('leaves a fixed slot exactly as given', () => {
    const held: SlotPick = { hex: parseHex('#1f2a44'), cursor: 7 };
    const picks = composeOutfit(base, { shoes: held }, () => 0);
    expect(picks.shoes).toEqual(held);
  });

  it('does not repeat the name of a fixed slot', () => {
    const held: SlotPick = { hex: parseHex('#1f2a44'), cursor: 7 };
    const picks = composeOutfit(base, { shoes: held }, () => 0);
    const others = SLOTS.filter((slot) => slot !== base.slot && slot !== 'shoes');
    for (const slot of others) expect(colorName(picks[slot]!.hex)).not.toBe(colorName(held.hex));
  });

  it('respects a fixed slot that comes after free slots in SLOTS order', () => {
    // Test that pre-registers all fixed slots. Fix 'accessory' (last in SLOTS)
    // to a hex that names to a colour 'outerwear' would naturally pick with
    // random = () => 0. The old single-loop code would not register the
    // accessory until reaching its position, so 'outerwear' would not see it
    // and would pick the same name, breaking deduplication.
    const fixedAccessory: SlotPick = { hex: parseHex('#8a8a8a'), cursor: 0 };
    const picks = composeOutfit(base, { accessory: fixedAccessory }, () => 0);
    const accessoryName = colorName(fixedAccessory.hex);
    const freeSlots = SLOTS.filter((slot) => slot !== base.slot && slot !== 'accessory');
    for (const slot of freeSlots) {
      expect(colorName(picks[slot]!.hex)).not.toBe(accessoryName);
    }
  });

  it('is deterministic when the offset is zero', () => {
    expect(composeOutfit(base, {}, () => 0)).toEqual(composeOutfit(base, {}, () => 0));
  });

  it('records a cursor that points at the colour it chose', () => {
    const picks = composeOutfit(base, {}, () => 0.5);
    for (const slot of SLOTS) {
      if (slot === base.slot) continue;
      const pick = picks[slot]!;
      expect(suggest(base.hex, slot, base.slot)[pick.cursor!]!.hex).toBe(pick.hex);
    }
  });

  // The free picker produces hexes the palette cannot name, and colorName then
  // returns a description. Deduplication reads that string like any other.
  it('composes against a base the palette cannot name', () => {
    const odd: Base = { slot: 'bottom', hex: parseHex('#12f4a7') };
    const picks = composeOutfit(odd, {}, () => 0);
    const named = SLOTS.filter((slot) => slot !== odd.slot);
    for (const slot of named) expect(picks[slot]).toBeDefined();
    const names = named.map((slot) => colorName(picks[slot]!.hex));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('checkedPieces', () => {
  const navy = parseHex('#1f2a44');
  const rust = parseHex('#a4522d');

  it('is the worn pieces with each swap laid over its slot', () => {
    expect(
      checkedPieces({
        photo: null,
        pieces: { top: { hex: navy, read: navy }, bottom: { hex: rust } },
        swaps: { bottom: navy },
      }),
    ).toEqual({ top: navy, bottom: navy });
  });

  it('leaves out slots with no piece', () => {
    expect(checkedPieces({ photo: null, pieces: { top: { hex: navy } }, swaps: {} })).toEqual({
      top: navy,
    });
  });
});
