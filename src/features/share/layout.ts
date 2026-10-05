import { needsBorder, readableForeground } from '../../color/contrast';
import { colorName } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';

/** 4:5, the tallest portrait a feed post takes uncropped, and an ordinary chat preview. */
export const IMAGE_WIDTH = 1080;
export const IMAGE_HEIGHT = 1350;

export type ShareImageInput = { pieces: Partial<Record<Slot, Hex>>; baseSlot: Slot | null };

/** What a share image shows: the outfit, and for a check, what the check says. */
export type ShareImage = ShareImageInput & { sentences?: readonly string[] };

/** The width `text` takes in `font`. Only a canvas can say, so the painter supplies it. */
export type Measure = (text: string, font: string) => number;

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
const SENTENCE_FONT = `400 32px ${FAMILY}`;
const SENTENCE_LINE = 44;
// From the first line's baseline up to the blocks: the line's ascent, 32,
// and a gap of 24.
const SENTENCE_CLEARANCE = 56;

/** Every font a share image uses, so the painter can load them first. */
export const IMAGE_FONTS: readonly string[] = [SLOT_FONT, NAME_FONT, WORDMARK_FONT, SENTENCE_FONT];

/**
 * `text` broken on spaces into lines no wider than `width`. A word wider than
 * the line takes a line of its own rather than being cut.
 */
export function wrap(text: string, width: number, font: string, measure: Measure): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, font) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

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
 *
 * A check's sentences sit under the blocks, above the wordmark, and the
 * blocks give up the height they need: the sentence is the result (handoff
 * notes), so it is on the picture as it is on the screen.
 */
export function layoutShareImage(
  { pieces, baseSlot, sentences = [] }: ShareImage,
  measure: Measure,
): DrawOp[] {
  const present = SLOTS.filter((slot) => pieces[slot] !== undefined);
  const width = IMAGE_WIDTH - 2 * PADDING;
  const lines = sentences.flatMap((sentence) => wrap(sentence, width, SENTENCE_FONT, measure));
  const blocksBottom = lines.length
    ? BLOCKS_BOTTOM - (lines.length - 1) * SENTENCE_LINE - SENTENCE_CLEARANCE
    : BLOCKS_BOTTOM;
  const height = (blocksBottom - PADDING - GAP * (present.length - 1)) / present.length;

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
  lines.forEach((text, index) => {
    ops.push({
      kind: 'text',
      x: PADDING,
      y: BLOCKS_BOTTOM - (lines.length - 1 - index) * SENTENCE_LINE,
      text,
      font: SENTENCE_FONT,
      color: INK,
    });
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
