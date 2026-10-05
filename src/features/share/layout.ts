import { needsBorder, readableForeground } from '../../color/contrast';
import { colorName } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';

/** 4:5, the tallest portrait a feed post takes uncropped, and an ordinary chat preview. */
export const IMAGE_WIDTH = 1080;
export const IMAGE_HEIGHT = 1350;

export type ShareImageInput = { pieces: Partial<Record<Slot, Hex>>; baseSlot: Slot | null };

/** One thing to paint. A text's `y` is its alphabetic baseline, and text is start-aligned. */
export type DrawOp =
  | { kind: 'fill'; color: string }
  | {
      kind: 'block';
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      color: Hex;
      hairline: boolean;
    }
  | { kind: 'text'; x: number; y: number; text: string; font: string; color: string };

// tokens.bg and tokens.ink. A StyleX token cannot reach a canvas.
const BACKGROUND = '#d8d5cf';
const INK = '#151413';

const PADDING = 40;
const GAP = 18;
const RADIUS = 24;
const INSET = 32;
const LINE = 58;
const BLOCKS_BOTTOM = 1242;
const WORDMARK_BASELINE = 1310;

// tokens.fontHeading's stack. A canvas paints a face that failed to load in
// the stack's next font, and without one it falls back to the browser's
// default, usually a serif.
const FAMILY = '"Outfit Variable", system-ui, sans-serif';
const SLOT_FONT = `500 30px ${FAMILY}`;
const NAME_FONT = `500 44px ${FAMILY}`;
const WORDMARK_FONT = `500 48px ${FAMILY}`;

/**
 * The share image as a list of things to paint, head to toe as the
 * suggestions screen stacks them.
 *
 * Apart from the painter because jsdom has no canvas. Every decision worth a
 * test is made here: which blocks, how tall, what each one says and in which
 * foreground. The painter only draws what this returns.
 *
 * The text keeps to the rules the screens keep (A11Y.md). The name sits on
 * its color in the foreground `readableForeground` picks, at full opacity,
 * and `colorName` describes a color the palette cannot name instead of
 * giving it a palette word.
 */
export function layoutShareImage({ pieces, baseSlot }: ShareImageInput): DrawOp[] {
  const present = SLOTS.filter((slot) => pieces[slot] !== undefined);
  const height = (BLOCKS_BOTTOM - PADDING - GAP * (present.length - 1)) / present.length;
  const width = IMAGE_WIDTH - 2 * PADDING;

  const ops: DrawOp[] = [{ kind: 'fill', color: BACKGROUND }];
  present.forEach((slot, index) => {
    const hex = pieces[slot]!;
    const y = PADDING + index * (height + GAP);
    const bottom = y + height;
    const foreground = readableForeground(hex).color;
    const label = SLOT_LABELS[slot].toUpperCase() + (slot === baseSlot ? ' · BASE' : '');
    ops.push(
      {
        kind: 'block',
        x: PADDING,
        y,
        width,
        height,
        radius: RADIUS,
        color: hex,
        hairline: needsBorder(hex),
      },
      {
        kind: 'text',
        x: PADDING + INSET,
        y: bottom - INSET - LINE,
        text: label,
        font: SLOT_FONT,
        color: foreground,
      },
      {
        kind: 'text',
        x: PADDING + INSET,
        y: bottom - INSET,
        text: colorName(hex),
        font: NAME_FONT,
        color: foreground,
      },
    );
  });
  ops.push({
    kind: 'text',
    x: PADDING,
    y: WORDMARK_BASELINE,
    text: 'huemi',
    font: WORDMARK_FONT,
    color: INK,
  });
  return ops;
}
