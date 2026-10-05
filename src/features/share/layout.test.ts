import { describe, expect, it } from 'vitest';
import { readableForeground } from '../../color/contrast';
import { colorName, PALETTE } from '../../color/palette';
import { parseHex, type Hex } from '../../model/hex';
import type { Slot } from '../../model/types';
import { layoutShareImage, type DrawOp } from './layout';

const OUTFIT: Partial<Record<Slot, Hex>> = {
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
    const ops = layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' });

    expect(ops[0]).toEqual({ kind: 'fill', color: '#d8d5cf' });
    expect(blocks(ops).map((block) => block.color)).toEqual(Object.values(OUTFIT));
    expect(ops.at(-1)).toMatchObject({ kind: 'text', text: 'huemi', x: 40, y: 1310 });
  });

  it('skips slots the outfit has no piece for', () => {
    const ops = layoutShareImage({
      pieces: { bottom: OUTFIT.bottom, top: OUTFIT.top },
      baseSlot: 'top',
    });

    expect(blocks(ops).map((block) => block.color)).toEqual([OUTFIT.top, OUTFIT.bottom]);
  });

  it('shares the height between blocks with 18 between them', () => {
    const five = blocks(layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }));
    const height = (1202 - 4 * 18) / 5;

    five.forEach((block, index) => {
      expect(block.x).toBe(40);
      expect(block.width).toBe(1000);
      expect(block.height).toBeCloseTo(height);
      expect(block.y).toBeCloseTo(40 + index * (height + 18));
      expect(block.radius).toBe(24);
    });
    expect(five.at(-1)!.y + five.at(-1)!.height).toBeCloseTo(1242);

    const [one] = blocks(layoutShareImage({ pieces: { top: OUTFIT.top }, baseSlot: 'top' }));
    expect(one).toMatchObject({ y: 40, height: 1202 });
  });

  it('labels each block by slot and marks the base', () => {
    const withBase = blockTexts(layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }));
    expect(withBase.map(({ slot }) => slot.text)).toEqual([
      'OUTERWEAR',
      'TOP',
      'BOTTOM · BASE',
      'SHOES',
      'ACCESSORY',
    ]);

    const without = texts(layoutShareImage({ pieces: OUTFIT, baseSlot: null }));
    expect(without.some((text) => text.text.includes('BASE'))).toBe(false);
  });

  it('names each color and draws both lines in the readable foreground', () => {
    const [, top, bottom] = blockTexts(layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }));

    expect(bottom!.name.text).toBe('Navy');
    expect(bottom!.slot.color).toBe('#ffffff');
    expect(bottom!.name.color).toBe('#ffffff');
    expect(top!.slot.color).toBe('#000000');
    expect(top!.name.color).toBe('#000000');
  });

  it('sets the slot line above the name, both inset from the block corner', () => {
    const ops = layoutShareImage({ pieces: { top: OUTFIT.top }, baseSlot: 'top' });
    const [block] = blocks(ops);
    const [{ slot, name }] = blockTexts(ops) as [{ slot: Text; name: Text }];
    const bottom = block!.y + block!.height;

    expect(name).toMatchObject({ x: 72, font: '500 44px "Outfit Variable"' });
    expect(name.y).toBeCloseTo(bottom - 32);
    expect(slot).toMatchObject({ x: 72, font: '500 30px "Outfit Variable"' });
    expect(slot.y).toBeCloseTo(bottom - 32 - 58);
  });

  it('draws a hairline on light blocks only', () => {
    const [, top, bottom] = blocks(layoutShareImage({ pieces: OUTFIT, baseSlot: 'bottom' }));

    expect(top!.hairline).toBe(true);
    expect(bottom!.hairline).toBe(false);
  });

  it('describes a color the palette cannot name', () => {
    const magenta = parseHex('#c431c4');
    const [{ name }] = blockTexts(
      layoutShareImage({ pieces: { top: magenta }, baseSlot: 'top' }),
    ) as [{ name: Text }];

    expect(name.text).toBe(colorName(magenta));
    expect(PALETTE.map((entry) => entry.name)).not.toContain(name.text);
    expect(name.color).toBe(readableForeground(magenta).color);
  });
});
