import { describe, expect, it } from 'vitest';
import { readableForeground } from '../../color/contrast';
import { colorName, PALETTE } from '../../color/palette';
import { parseHex, type Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { charMeasure } from './fakeShare.testing';
import { IMAGE_FONTS, layoutShareImage, wrap, type DrawOp } from './layout';

const OUTFIT: Record<Slot, Hex> = {
  outerwear: parseHex('#b88a5c'),
  top: parseHex('#ffffff'),
  bottom: parseHex('#1f2a44'),
  shoes: parseHex('#c9a57e'),
  accessory: parseHex('#6e1f2c'),
};

type Block = Extract<DrawOp, { kind: 'block' }>;
type Text = Extract<DrawOp, { kind: 'text' }>;

const blocks = (ops: DrawOp[]) => ops.filter((op): op is Block => op.kind === 'block');
const texts = (ops: DrawOp[]) => ops.filter((op): op is Text => op.kind === 'text');

/** The slot label and the name drawn for each block, in that order. */
function blockTexts(ops: DrawOp[]): { slot: Text; name: Text }[] {
  const out: { slot: Text; name: Text }[] = [];
  ops.forEach((op, index) => {
    if (op.kind !== 'block') return;
    out.push({ slot: ops[index + 1] as Text, name: ops[index + 2] as Text });
  });
  return out;
}

describe('layoutShareImage', () => {
  it('paints the background first, then one block per piece head to toe, then the wordmark', () => {
    const ops = layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }, charMeasure);

    expect(ops[0]).toEqual({ kind: 'fill', color: '#d8d5cf' });
    expect(blocks(ops).map((block) => block.color)).toEqual(Object.values(OUTFIT));
    expect(ops.at(-1)).toMatchObject({ kind: 'text', text: 'huemi', x: 40, y: 1310 });
  });

  it('skips slots the outfit has no piece for', () => {
    const ops = layoutShareImage(
      {
        pieces: { bottom: OUTFIT.bottom, top: OUTFIT.top },
        baseSlot: 'top',
      },
      charMeasure,
    );

    expect(blocks(ops).map((block) => block.color)).toEqual([OUTFIT.top, OUTFIT.bottom]);
  });

  it('shares the height between blocks with 18 between them', () => {
    const five = blocks(layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }, charMeasure));
    const height = (1202 - 4 * 18) / 5;

    five.forEach((block, index) => {
      expect(block.x).toBe(40);
      expect(block.width).toBe(1000);
      expect(block.height).toBeCloseTo(height);
      expect(block.y).toBeCloseTo(40 + index * (height + 18));
      expect(block.radius).toBe(24);
    });
    expect(five.at(-1)!.y + five.at(-1)!.height).toBeCloseTo(1242);

    const [one] = blocks(
      layoutShareImage({ pieces: { top: OUTFIT.top }, baseSlot: 'top' }, charMeasure),
    );
    expect(one).toMatchObject({ y: 40, height: 1202 });
  });

  it('labels each block by slot and marks the base', () => {
    const withBase = blockTexts(
      layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }, charMeasure),
    );
    expect(withBase.map(({ slot }) => slot.text)).toEqual([
      'OUTERWEAR',
      'TOP',
      'BOTTOM · BASE',
      'SHOES',
      'ACCESSORY',
    ]);

    const without = texts(layoutShareImage({ pieces: OUTFIT, baseSlot: null }, charMeasure));
    expect(without.some((text) => text.text.includes('BASE'))).toBe(false);
  });

  it('names each color and draws both lines in the readable foreground', () => {
    const [, top, bottom] = blockTexts(
      layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }, charMeasure),
    );

    expect(bottom!.name.text).toBe('Navy');
    expect(bottom!.slot.color).toBe('#ffffff');
    expect(bottom!.name.color).toBe('#ffffff');
    expect(top!.slot.color).toBe('#000000');
    expect(top!.name.color).toBe('#000000');
  });

  it('sets the slot line above the name, both inset from the block corner', () => {
    const ops = layoutShareImage({ pieces: { top: OUTFIT.top }, baseSlot: 'top' }, charMeasure);
    const [block] = blocks(ops);
    const [{ slot, name }] = blockTexts(ops) as [{ slot: Text; name: Text }];
    const bottom = block!.y + block!.height;

    expect(name).toMatchObject({
      x: 72,
      font: '500 44px "Outfit Variable", system-ui, sans-serif',
    });
    expect(name.y).toBeCloseTo(bottom - 32);
    expect(slot).toMatchObject({
      x: 72,
      font: '500 30px "Outfit Variable", system-ui, sans-serif',
    });
    expect(slot.y).toBeCloseTo(bottom - 32 - 58);
  });

  it('draws a hairline on light blocks only', () => {
    const [, top, bottom] = blocks(
      layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }, charMeasure),
    );

    expect(top!.hairline).toBe(true);
    expect(bottom!.hairline).toBe(false);
  });

  it('describes a color the palette cannot name', () => {
    const magenta = parseHex('#c431c4');
    const [{ name }] = blockTexts(
      layoutShareImage({ pieces: { top: magenta }, baseSlot: 'top' }, charMeasure),
    ) as [{ slot: Text; name: Text }];

    expect(name.text).toBe(colorName(magenta));
    expect(PALETTE.map((entry) => entry.name)).not.toContain(name.text);
    expect(name.color).toBe(readableForeground(magenta).color);
  });

  describe('sentences', () => {
    const SENTENCE_FONT = '400 32px "Outfit Variable", system-ui, sans-serif';
    const LONG =
      'Warm and cool together: the cream top and the navy trousers, which is a long line.';

    it('wraps a long sentence within the width', () => {
      const lines = wrap(LONG, 1000, SENTENCE_FONT, charMeasure);

      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const line of lines) expect(charMeasure(line, SENTENCE_FONT)).toBeLessThanOrEqual(1000);
      expect(lines.join(' ')).toBe(LONG);
    });

    it('puts a word wider than the line on a line of its own', () => {
      const wide = 'x'.repeat(80);

      expect(wrap(`a ${wide} b`, 1000, SENTENCE_FONT, charMeasure)).toEqual(['a', wide, 'b']);
    });

    it('sets the sentences under the blocks and gives up their height', () => {
      // At 16 px a character under charMeasure, 'Short.' is one line and LONG is two.
      const ops = layoutShareImage(
        { pieces: OUTFIT, baseSlot: 'bottom', sentences: ['Short.', LONG] },
        charMeasure,
      );
      const sentenceOps = texts(ops).filter((text) => text.font === SENTENCE_FONT);

      expect(sentenceOps.map((text) => text.y)).toEqual([1242 - 88, 1242 - 44, 1242]);
      for (const text of sentenceOps) expect(text).toMatchObject({ x: 40, color: '#151413' });
      const last = blocks(ops).at(-1)!;
      expect(last.y + last.height).toBeCloseTo(1242 - 2 * 44 - 56);
      expect(ops.at(-1)).toMatchObject({ text: 'huemi' });
    });

    it('lays out exactly as before without sentences', () => {
      const without = layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }, charMeasure);

      expect(
        layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom', sentences: [] }, charMeasure),
      ).toEqual(without);
      const last = blocks(without).at(-1)!;
      expect(last.y + last.height).toBeCloseTo(1242);
    });

    it('lists every font it uses', () => {
      const ops = layoutShareImage(
        { pieces: OUTFIT, baseSlot: 'bottom', sentences: [LONG] },
        charMeasure,
      );

      for (const text of texts(ops)) expect(IMAGE_FONTS).toContain(text.font);
    });
  });
});
