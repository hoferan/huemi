/// <reference types="node" />
// The app's tsconfig sets types to vite/client alone, so browser code cannot
// reach for node APIs by accident. This file is the one exception: it reads a
// dataset off disk and never ships. The reference is scoped here rather than
// widened in tsconfig.json so that exception stays visible.

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../model/hex';
import type { Slot } from '../model/types';
import { TUNING, rate } from './engine';
import type { WornPieces } from './check';
import { chromaLoad } from './score';
import { temperature } from './classify';

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
 */
const DIR = 'tmp/polyvore';
const present = ['train', 'valid', 'test']
  .map((n) => `${DIR}/${n}_no_dup.json`)
  .concat([`${DIR}/fill_in_blank_test.json`, `${DIR}/fashion_compatibility_prediction.txt`])
  .every((f) => existsSync(f));

/** Polyvore category id to huemi slot. Non-garments are left out entirely. */
const SLOT_OF: Readonly<Record<number, Slot>> = {
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
    if (slot === 'accessory') continue;
    out[slot] ??= piece.hex;
  }
  return Object.keys(out).length >= 2 ? out : null;
}

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
    const rows = compatibility(index()).flatMap(({ label, pieces }) => {
      const outfit = worn(pieces);
      if (!outfit) return [];
      const temperatures = Object.values(outfit).map((hex) => temperature(hex));
      return [
        {
          label,
          colorful: chromaLoad(outfit) > TUNING.chromaBudget,
          mixes: temperatures.includes('warm') && temperatures.includes('cool'),
        },
      ];
    });
    const share = (label: number, key: 'colorful' | 'mixes') => {
      const group = rows.filter((r) => r.label === label);
      return group.filter((r) => r[key]).length / group.length;
    };

    expect(rows.length).toBeGreaterThan(500);
    expect(share(1, 'colorful')).toBeGreaterThanOrEqual(share(0, 'colorful'));
    expect(share(1, 'mixes')).toBeGreaterThanOrEqual(share(0, 'mixes'));
  });

  it('picks the real item over the benchmark decoys more often than chance', () => {
    const items = index();
    const questions = JSON.parse(readFileSync(`${DIR}/fill_in_blank_test.json`, 'utf8')) as {
      question: string[];
      answers: string[];
    }[];

    let n = 0;
    let correct = 0;
    let chance = 0;
    for (const q of questions) {
      const context = q.question.map((id) => items.get(id)).filter((p): p is Piece => !!p);
      if (context.length === 0 || !items.get(q.answers[0]!)) continue;

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

    // 57.8% against a 47.5% chance line when this was written. The shipped ramp
    // scored 40.6%, below chance, which is what ADR 0010 set out to fix.
    expect(n).toBeGreaterThan(40);
    expect(correct / n).toBeGreaterThan(chance / n);
  });

  it('ranks human-labelled compatible outfits above incompatible ones', () => {
    const items = index();
    const rows: { label: number; score: number }[] = [];

    for (const { label, pieces } of compatibility(items)) {
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
    rows.sort((a, b) => a.score - b.score);
    const positives = rows.filter((r) => r.label === 1).length;
    const negatives = rows.length - positives;
    const rankSum = rows.reduce((sum, r, i) => (r.label === 1 ? sum + i + 1 : sum), 0);
    const auc = (rankSum - (positives * (positives + 1)) / 2) / (positives * negatives);

    // 0.578 when this was written, against 0.398 for the shipped ramp. Zhang
    // and others reach 0.84 on this benchmark, with a model trained on three
    // K-means dominant colours per garment rather than thirteen constants read
    // off a colour word, so it is a reference point and not a target.
    expect(rows.length).toBeGreaterThan(500);
    expect(auc).toBeGreaterThan(0.5);
  });
});
