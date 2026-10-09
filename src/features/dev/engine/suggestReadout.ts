import { TUNING, isNearDuplicate, rateTerms, suggest } from '../../../color/engine';
import { colorName } from '../../../color/palette';
import { chromaLoad } from '../../../color/score';
import type { Hex } from '../../../model/hex';
import { SLOTS, SLOT_LABELS, type Slot } from '../../../model/types';
import { whyNotChosen, type WhyNot } from '../../../session/select';
import { fmt } from '../reader/readout';
import { sideBySide } from './format';

export type SlotReadout = {
  slot: Slot;
  heading: string;
  terms: string;
  note: string | null;
  above: string[];
};
export type SuggestReadout = { total: string; slots: SlotReadout[] };

function reasonText(name: string, why: WhyNot): string {
  switch (why.kind) {
    case 'name':
      return `${name}: name shown in ${SLOT_LABELS[why.slot]}`;
    case 'budget':
      return `${name}: chroma ${sideBySide(why.load, TUNING.chromaBudget, 3)[0]}`;
    case 'fits':
      return `${name}: fits`;
  }
}

/**
 * What the engine made of an outfit on the suggestions screen, as lines for
 * the engine panel. Each piece other than the base gets its rank in the list
 * `suggest()` gives its slot, its score split into the terms `rate()` adds,
 * and, for every color ranked above it, the rule that keeps that color out of
 * this outfit (`whyNotChosen`).
 *
 * `pieces` holds the whole outfit, the base included.
 */
export function suggestReadout(baseSlot: Slot, pieces: Partial<Record<Slot, Hex>>): SuggestReadout {
  const base = pieces[baseSlot]!;
  const load = chromaLoad(pieces);
  const budget = TUNING.chromaBudget;
  const [loadText, budgetText] = sideBySide(load, budget, 3);
  const total = `Outfit chroma ${loadText} ${load > budget ? 'over' : 'of'} ${budgetText}`;

  const slots = SLOTS.flatMap((slot): SlotReadout[] => {
    const hex = pieces[slot];
    if (slot === baseSlot || !hex) return [];
    const list = suggest(base, slot, baseSlot);
    const index = list.findIndex((entry) => entry.hex === hex);
    const t = rateTerms(base, hex, slot, baseSlot);
    const score = fmt(t.lightness + t.chroma + t.temperature + t.hue);
    const rank = index === -1 ? 'not in the list' : `#${index + 1} of ${list.length}`;
    return [
      {
        slot,
        heading: [SLOT_LABELS[slot], colorName(hex), rank, score].join(' · '),
        terms: [
          `L ${fmt(t.lightness)}/${TUNING.weightLightness}`,
          `C ${fmt(t.chroma)}/${TUNING.weightChroma}`,
          `T ${fmt(t.temperature)}/${TUNING.weightTemperature}`,
          `H ${fmt(t.hue)}/${TUNING.weightHue}`,
        ].join(' · '),
        note: isNearDuplicate(base, hex) ? 'Near-duplicate of yours, sorted last' : null,
        above:
          index === -1
            ? []
            : list
                .slice(0, index)
                .map((entry) => reasonText(entry.name, whyNotChosen(pieces, slot, entry.hex))),
      },
    ];
  });

  return { total, slots };
}
