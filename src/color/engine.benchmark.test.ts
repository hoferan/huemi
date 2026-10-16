/// <reference types="node" />
// The app's tsconfig sets types to vite/client alone. This file reads a
// dataset off disk and never ships, so it asks for node's types here, where
// the reason is visible, instead of in tsconfig.json. A reference reaches
// every file tsc checks alongside it, though, so it is a label and not a
// fence: `src/color/fieldFiles.ts` and `src/dev/fieldData.ts` carry one too.

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { TUNING, rate } from './engine';
import type { WornPieces } from './check';
import { chromaLoad } from './score';
import { temperature } from './classify';
import { aucByRank } from './voteScore';

/**
 * The engine measured against the Polyvore benchmarks (ADR 0010).
 *
 * This is how the lightness term's shape was settled and how a later change to
 * `TUNING` gets checked, so it is committed rather than left in a scratch file.
 * The dataset is 45MB of someone else's crawl and is not ours to redistribute,
 * so it lives in the gitignored `tmp/polyvore/` and these tests skip without
 * it. CI therefore never runs them; they are for whoever is retuning.
 *
 * To run: put `train_no_dup.json`, `valid_no_dup.json`, `test_no_dup.json`,
 * `fill_in_blank_test.json`, `fashion_compatibility_prediction.txt` and
 * `category_id.txt` from github.com/xthan/polyvore-dataset (Apache-2.0) into
 * `tmp/polyvore/`, then `npm test`.
 *
 * The thresholds below are floors, not targets. They are set well under what
 * the shipped tuning scores so that ordinary retuning does not trip them, and
 * they exist to catch a change that puts the engine back below chance.
 *
 * Dresses, jumpsuits and rompers read as `dress` (#136). The three tests that
 * settled the tuning run without them, so the numbers ADR 0010 and ADR 0014
 * quote stay what they were, and the dress gets a section of its own that
 * prints what the engine makes of outfits with one. Nothing was retuned for it.
 */
const DIR = 'tmp/polyvore';
const present = ['train', 'valid', 'test']
  .map((n) => `${DIR}/${n}_no_dup.json`)
  .concat([`${DIR}/fill_in_blank_test.json`, `${DIR}/fashion_compatibility_prediction.txt`])
  .every((f) => existsSync(f));

/** Polyvore category id to huemi slot. Non-garments are left out entirely. */
const SLOT_OF: Readonly<Record<number, Slot>> = {
  // Dresses, day and cocktail dresses, gowns and wedding dresses, then
  // jumpsuits and rompers: one garment where a top and a bottom would be.
  3: 'dress',
  4: 'dress',
  5: 'dress',
  6: 'dress',
  4516: 'dress',
  243: 'dress',
  244: 'dress',
  23: 'outerwear',
  24: 'outerwear',
  25: 'outerwear',
  26: 'outerwear',
  236: 'outerwear',
  11: 'top',
  15: 'top',
  17: 'top',
  18: 'top',
  19: 'top',
  21: 'top',
  104: 'top',
  4495: 'top',
  7: 'bottom',
  8: 'bottom',
  9: 'bottom',
  10: 'bottom',
  27: 'bottom',
  28: 'bottom',
  29: 'bottom',
  237: 'bottom',
  240: 'bottom',
  241: 'bottom',
  41: 'shoes',
  42: 'shoes',
  43: 'shoes',
  46: 'shoes',
  47: 'shoes',
  49: 'shoes',
  261: 'shoes',
  36: 'accessory',
  37: 'accessory',
  38: 'accessory',
  52: 'accessory',
  55: 'accessory',
  105: 'accessory',
  259: 'accessory',
  318: 'accessory',
};

/**
 * Colour word to a representative garment hex.
 *
 * Metallics are absent on purpose: on a bag or a shoe, "gold" and "silver" name
 * hardware rather than the body of the garment, and "rose" is almost always
 * rose gold in this data. Collapsing every "black" to one hex overstates how
 * often real outfits are exactly tonal, which is why ADR 0010 reads the first
 * histogram bin as a range and not as a point.
 */
const COLOR_OF: Readonly<Record<string, string>> = {
  black: '#1a1a1a',
  white: '#f5f5f2',
  ivory: '#f2ece0',
  cream: '#efe4cd',
  ecru: '#dcd3c0',
  grey: '#8a8a8a',
  gray: '#8a8a8a',
  charcoal: '#3d3d3f',
  navy: '#1f2a44',
  blue: '#2d5fa8',
  denim: '#4a6285',
  cobalt: '#0f4fa8',
  indigo: '#2b3a67',
  teal: '#17706e',
  turquoise: '#2bb3ac',
  aqua: '#7fd4d0',
  mint: '#a8dfc4',
  green: '#2f6b3f',
  olive: '#6b6a3f',
  khaki: '#a89c78',
  emerald: '#157f52',
  forest: '#2f4a3a',
  sage: '#9aa98d',
  lime: '#9fbf3f',
  red: '#b32d2d',
  burgundy: '#6b2733',
  maroon: '#62232b',
  wine: '#5d2433',
  crimson: '#a41f35',
  scarlet: '#b32d21',
  berry: '#7a2247',
  cherry: '#9e1b32',
  pink: '#e8a0b8',
  blush: '#e8c2c2',
  fuchsia: '#c8347f',
  magenta: '#b9338a',
  coral: '#e4735c',
  salmon: '#e79a86',
  purple: '#6b3f8f',
  lilac: '#c3aad6',
  lavender: '#cbb8e0',
  plum: '#5f3a55',
  violet: '#6a4a9c',
  mauve: '#a98899',
  yellow: '#e8cc4a',
  mustard: '#c39a3a',
  lemon: '#ecd96b',
  orange: '#d97a2b',
  rust: '#a4522d',
  apricot: '#e8a765',
  peach: '#f0bd9a',
  brown: '#5a3e2e',
  tan: '#c9ad86',
  camel: '#b58a5a',
  beige: '#d9c9ad',
  taupe: '#a89887',
  nude: '#ddbfa8',
  chocolate: '#4a2f22',
  cognac: '#8a4b28',
  sand: '#ddceac',
  stone: '#bdb5a5',
  caramel: '#a9702f',
};

const RE = new RegExp('\\b(' + Object.keys(COLOR_OF).join('|') + ')\\b');

type Piece = { slot: Slot; hex: Hex };

const readPiece = (name: string | undefined, categoryid: number): Piece | null => {
  const slot = SLOT_OF[categoryid];
  if (!slot) return null;
  const m = String(name ?? '')
    .toLowerCase()
    .match(RE);
  return m ? { slot, hex: parseHex(COLOR_OF[m[1]!]!) } : null;
};

/** `setid_index` to piece, across every split, for joining the benchmark files. */
function index(): Map<string, Piece> {
  const map = new Map<string, Piece>();
  for (const split of ['train', 'valid', 'test']) {
    const data = JSON.parse(readFileSync(`${DIR}/${split}_no_dup.json`, 'utf8')) as {
      set_id: string;
      items: { index: number; name?: string; categoryid: number }[];
    }[];
    for (const outfit of data) {
      for (const item of outfit.items) {
        const piece = readPiece(item.name, item.categoryid);
        if (piece) map.set(`${outfit.set_id}_${item.index}`, piece);
      }
    }
  }
  return map;
}

/** The index as it was before the dress, which the tuning was measured on. */
function separates(items: Map<string, Piece>): Map<string, Piece> {
  return new Map([...items].filter(([, piece]) => piece.slot !== 'dress'));
}

/** How a candidate scores against the pieces already in an outfit. */
function against(context: Piece[], candidate: Piece): number | null {
  const usable = context.filter((c) => c.slot !== candidate.slot);
  if (usable.length === 0) return null;
  let total = 0;
  for (const c of usable) total += rate(c.hex, candidate.hex, candidate.slot, c.slot);
  return total / usable.length;
}

/** The human-labelled outfits: 1 compatible, 0 not, each with the pieces the color words gave. */
function compatibility(items: Map<string, Piece>): { label: number; pieces: Piece[] }[] {
  return readFileSync(`${DIR}/fashion_compatibility_prediction.txt`, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const pieces = parts
        .slice(1)
        .map((id) => items.get(id))
        .filter((p): p is Piece => !!p);
      return { label: Number(parts[0]), pieces };
    });
}

/**
 * The outfit as the check sees it: the first piece in each checked slot,
 * accessories dropped. Null under two pieces, where the check has nothing to say.
 */
function worn(pieces: Piece[]): WornPieces | null {
  const out: WornPieces = {};
  for (const piece of pieces) {
    const slot = piece.slot;
    // The index has no dress here (`separates`), and the check has none yet (#137).
    if (slot === 'accessory' || slot === 'dress') continue;
    out[slot] ??= piece.hex;
  }
  return Object.keys(out).length >= 2 ? out : null;
}

/**
 * The share of human-labelled outfits over the chroma budget and mixing warm
 * with cool, compatible against incompatible. `outfit` reads the pieces the
 * way the caller wants them weighed.
 */
function colorAndTemperature(
  items: Map<string, Piece>,
  outfit: (pieces: Piece[]) => Partial<Record<Slot, Hex>> | null,
) {
  const rows = compatibility(items).flatMap(({ label, pieces }) => {
    const worn = outfit(pieces);
    if (!worn) return [];
    const temperatures = Object.values(worn).map((hex) => temperature(hex));
    return [
      {
        label,
        colorful: chromaLoad(worn) > TUNING.chromaBudget,
        mixes: temperatures.includes('warm') && temperatures.includes('cool'),
      },
    ];
  });
  const share = (label: number, key: 'colorful' | 'mixes') => {
    const group = rows.filter((r) => r.label === label);
    return group.filter((r) => r[key]).length / group.length;
  };
  return { rows, share };
}

/**
 * The blank-filling benchmark over the questions `keep` accepts: how often the
 * real item outscores the decoys, and the chance line coverage leaves.
 */
function fillInTheBlank(items: Map<string, Piece>, keep: (pieces: Piece[]) => boolean) {
  const questions = JSON.parse(readFileSync(`${DIR}/fill_in_blank_test.json`, 'utf8')) as {
    question: string[];
    answers: string[];
  }[];

  let n = 0;
  let correct = 0;
  let chance = 0;
  for (const q of questions) {
    const context = q.question.map((id) => items.get(id)).filter((p): p is Piece => !!p);
    const answer = items.get(q.answers[0]!);
    if (context.length === 0 || !answer || !keep([...context, answer])) continue;

    const scored: { option: number; score: number }[] = [];
    q.answers.forEach((id, option) => {
      const piece = items.get(id);
      if (!piece) return;
      const score = against(context, piece);
      if (score !== null) scored.push({ option, score });
    });
    if (scored.length < 2 || !scored.some((x) => x.option === 0)) continue;

    n += 1;
    chance += 1 / scored.length;
    // The true answer is always first; the rest are the benchmark's decoys.
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
    if (best.option === 0) correct += 1;
  }
  return { n, correct, chance };
}

/**
 * Compatibility AUC over the outfits `keep` accepts, each scored as the mean
 * `rate` over its pairs of pieces in different slots.
 */
function compatibilityAuc(items: Map<string, Piece>, keep: (pieces: Piece[]) => boolean) {
  const rows: { label: number; score: number }[] = [];

  for (const { label, pieces } of compatibility(items)) {
    if (!keep(pieces)) continue;
    let total = 0;
    let n = 0;
    for (const a of pieces) {
      for (const b of pieces) {
        if (a === b || a.slot === b.slot) continue;
        total += rate(a.hex, b.hex, b.slot, a.slot);
        n += 1;
      }
    }
    if (n > 0) rows.push({ label, score: total / n });
  }

  // AUC by rank: the chance a random compatible outfit outscores a random
  // incompatible one.
  const positives = rows.filter((r) => r.label === 1).map((r) => r.score);
  const negatives = rows.filter((r) => r.label !== 1).map((r) => r.score);
  const auc = aucByRank(positives, negatives);
  return { rows: rows.length, positives: positives.length, negatives: negatives.length, auc };
}

const everything = () => true;
const hasDress = (pieces: Piece[]) => pieces.some((piece) => piece.slot === 'dress');

/** An outfit with a dress as the composer weighs it: the first piece in each slot. */
function dressed(pieces: Piece[]): Partial<Record<Slot, Hex>> | null {
  if (!hasDress(pieces)) return null;
  const out: Partial<Record<Slot, Hex>> = {};
  for (const piece of pieces) out[piece.slot] ??= piece.hex;
  return Object.keys(out).length >= 2 ? out : null;
}

const percent = (x: number) => `${(100 * x).toFixed(1)}%`;

describe.skipIf(!present)('the engine against Polyvore', () => {
  // Why the outfit check describes and never flags (ADR 0014). In the
  // compatibility set, the outfits people rated as working carry more color
  // than the ones they rated as not, and mix warm and cool more often: 29.5%
  // of compatible outfits are over the composer's chroma budget against 23.7%
  // of incompatible ones, and 22.0% mix warm and cool against 17.0%, on 332
  // and 317 outfits when this was written. A "too much color" or "warm against
  // cool" flag would point at good outfits more often than bad ones. If a
  // better reading of color ever reverses this, the test fails and the
  // describe-only decision is worth revisiting.
  it('finds no sign that color or warm against cool marks a bad outfit', () => {
    const { rows, share } = colorAndTemperature(separates(index()), worn);

    expect(rows.length).toBeGreaterThan(500);
    expect(share(1, 'colorful')).toBeGreaterThanOrEqual(share(0, 'colorful'));
    expect(share(1, 'mixes')).toBeGreaterThanOrEqual(share(0, 'mixes'));
  });

  it('picks the real item over the benchmark decoys more often than chance', () => {
    const { n, correct, chance } = fillInTheBlank(separates(index()), everything);

    // 57.8% against a 47.5% chance line when this was written. The shipped ramp
    // scored 40.6%, below chance, which is what ADR 0010 set out to fix.
    expect(n).toBeGreaterThan(40);
    expect(correct / n).toBeGreaterThan(chance / n);
  });

  it('ranks human-labelled compatible outfits above incompatible ones', () => {
    const { rows, auc } = compatibilityAuc(separates(index()), everything);

    // 0.578 when this was written, against 0.398 for the shipped ramp. Zhang
    // and others reach 0.84 on this benchmark, with a model trained on three
    // K-means dominant colours per garment rather than thirteen constants read
    // off a colour word, so it is a reference point and not a target.
    expect(rows).toBeGreaterThan(500);
    expect(auc).toBeGreaterThan(0.5);
  });

  // The dress on its own (#136). Printed, not held to a floor: nothing was
  // tuned on these outfits, and there are too few for a floor to mean much.
  // They are here so whoever retunes can see what a change does to outfits
  // with a dress before deciding whether to tune for them.
  it('prints what it makes of outfits with a dress', () => {
    const items = index();
    const blank = fillInTheBlank(items, hasDress);
    const auc = compatibilityAuc(items, hasDress);
    const { rows, share } = colorAndTemperature(items, dressed);
    const count = (label: number) => rows.filter((r) => r.label === label).length;

    const lines = [
      'Outfits with a dress',
      `  fill in the blank  ${percent(blank.correct / blank.n)} against ${percent(blank.chance / blank.n)} by chance, on ${blank.n} questions`,
      `  compatibility AUC  ${auc.auc.toFixed(3)}, on ${auc.positives} compatible and ${auc.negatives} incompatible`,
      `  over the budget    ${percent(share(1, 'colorful'))} of compatible, ${percent(share(0, 'colorful'))} of incompatible`,
      `  warm with cool     ${percent(share(1, 'mixes'))} of compatible, ${percent(share(0, 'mixes'))} of incompatible, on ${count(1)} and ${count(0)}`,
    ];
    console.log(`\n${lines.join('\n')}\n`);

    expect(blank.n).toBeGreaterThan(0);
    expect(auc.positives).toBeGreaterThan(0);
    expect(auc.negatives).toBeGreaterThan(0);
  });
});
