import { describe, expect, it } from 'vitest';
import { suggest, TUNING } from '../color/engine';
import { chroma } from '../color/classify';
import { PALETTE, colorName } from '../color/palette';
import { chromaLoad } from '../color/score';
import { parseHex, type Hex } from '../model/hex';
import { SLOTS, type Slot } from '../model/types';
import {
  advance,
  checkedPieces,
  composeOutfit,
  locate,
  positionLabel,
  shownNames,
  whyNotChosen,
} from './select';
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
        pieces: { top: { hex: navy }, bottom: { hex: rust } },
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

describe('shownNames', () => {
  it('maps each name on screen to the first slot showing it, head to toe', () => {
    const shown = shownNames({
      top: parseHex('#8a8a8a'),
      shoes: parseHex('#8a8a8a'),
      bottom: parseHex('#c9ad86'),
    });
    expect([...shown]).toEqual([
      ['Grey', 'top'],
      ['Tan', 'bottom'],
    ]);
  });
});

describe('whyNotChosen', () => {
  // The outfit `composeOutfit` seeds for a Mustard top.
  const mustard: Partial<Record<Slot, Hex>> = {
    outerwear: parseHex('#8a8a8a'),
    top: parseHex('#c39a3a'),
    bottom: parseHex('#e6e5e2'),
    shoes: parseHex('#c9ad86'),
    accessory: parseHex('#b58a5a'),
  };

  it('names the slot that already shows a color', () => {
    expect(whyNotChosen(mustard, 'bottom', parseHex('#8a8a8a'))).toEqual({
      kind: 'name',
      slot: 'outerwear',
    });
    expect(whyNotChosen(mustard, 'bottom', parseHex('#c9ad86'))).toEqual({
      kind: 'name',
      slot: 'shoes',
    });
    expect(whyNotChosen(mustard, 'bottom', parseHex('#b58a5a'))).toEqual({
      kind: 'name',
      slot: 'accessory',
    });
  });

  it('gives the outfit chroma a color would bring', () => {
    const cream = whyNotChosen(mustard, 'bottom', parseHex('#e9dfc9'));
    expect(cream.kind).toBe('budget');
    expect(cream.kind === 'budget' && cream.load).toBeCloseTo(0.136, 3);
    const mauve = whyNotChosen(mustard, 'bottom', parseHex('#ab6983'));
    expect(mauve.kind === 'budget' && mauve.load).toBeCloseTo(0.183, 3);
  });

  it('lets the pick itself fit', () => {
    expect(whyNotChosen(mustard, 'bottom', parseHex('#e6e5e2'))).toEqual({ kind: 'fits' });
  });

  // Holds against the finished outfit, not only at the step the composer
  // took, because later picks only add names and only add chroma.
  it('agrees with the composer for every seeded outfit', () => {
    let within = 0;
    let over = 0;
    for (const color of PALETTE) {
      for (const baseSlot of SLOTS) {
        const picks = composeOutfit({ slot: baseSlot, hex: color.hex }, {}, () => 0);
        const pieces: Partial<Record<Slot, Hex>> = { [baseSlot]: color.hex };
        for (const slot of SLOTS) if (picks[slot]) pieces[slot] = picks[slot].hex;
        const inBudget = chromaLoad(pieces) <= TUNING.chromaBudget;
        if (inBudget) within += 1;
        else over += 1;
        for (const slot of SLOTS) {
          const pick = picks[slot];
          if (slot === baseSlot || !pick) continue;
          const ranked = suggest(color.hex, slot, baseSlot);
          for (const above of ranked.slice(0, pick.cursor)) {
            expect(whyNotChosen(pieces, slot, above.hex).kind).not.toBe('fits');
          }
          expect(whyNotChosen(pieces, slot, pick.hex).kind).toBe(inBudget ? 'fits' : 'budget');
        }
      }
    }
    expect(within).toBe(103);
    expect(over).toBe(2);
  });
});
