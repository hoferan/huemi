import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../../model/hex';
import type { CheckSlot } from '../../model/types';
import { PALETTE } from '../../color/palette';
import { CHECK_TITLE, observationText } from './copy';

const hex = (name: string): Hex => {
  const found = PALETTE.find((color) => color.name === name);
  if (!found) throw new Error(`No palette color called ${name}`);
  return found.hex;
};
const piece = (slot: CheckSlot, name: string) => ({ slot, hex: hex(name) });

describe('CHECK_TITLE', () => {
  it('uses the words the copy guidance asks for', () => {
    expect(CHECK_TITLE).toBe('How it works together');
  });
});

describe('observationText', () => {
  it('names the piece carrying the color in a quiet outfit', () => {
    expect(
      observationText({ term: 'color', kind: 'quiet', pieces: [piece('outerwear', 'Navy')] }),
    ).toBe('Quiet overall, and the navy jacket carries the most color.');
  });

  it('agrees the verb with a plural piece', () => {
    expect(
      observationText({ term: 'color', kind: 'quiet', pieces: [piece('shoes', 'Rust')] }),
    ).toBe('Quiet overall, and the rust shoes carry the most color.');
  });

  it('names where most of the color is in a colorful outfit', () => {
    expect(
      observationText({ term: 'color', kind: 'colorful', pieces: [piece('bottom', 'Mustard')] }),
    ).toBe('Plenty of color, and the mustard trousers carry the most.');
  });

  it('says an outfit of neutrals has nothing competing', () => {
    expect(observationText({ term: 'color', kind: 'neutral', pieces: [] })).toBe(
      'All neutrals, so nothing competes.',
    );
  });

  it('says which side the colors sit on', () => {
    expect(observationText({ term: 'temperature', kind: 'warm', pieces: [] })).toBe(
      'The colors all sit on the warm side.',
    );
    expect(observationText({ term: 'temperature', kind: 'cool', pieces: [] })).toBe(
      'The colors all sit on the cool side.',
    );
  });

  it('names the warm and the cool piece when both are there', () => {
    const text = observationText({
      term: 'temperature',
      kind: 'mixed',
      pieces: [piece('top', 'Cream'), piece('outerwear', 'Navy')],
    });
    expect(text).toBe('Warm and cool together: the cream top and the navy jacket.');
  });

  it('describes a tonal outfit', () => {
    expect(observationText({ term: 'lightness', kind: 'tonal', pieces: [] })).toBe(
      'Close in lightness, which reads calm.',
    );
  });

  it('names the lightest and darkest piece', () => {
    const text = observationText({
      term: 'lightness',
      kind: 'contrast',
      pieces: [piece('top', 'Cream'), piece('outerwear', 'Charcoal')],
    });
    expect(text).toBe('The cream top and the charcoal jacket give it clear light and dark.');
  });

  it('keeps a two-word name in lower case', () => {
    expect(
      observationText({ term: 'color', kind: 'quiet', pieces: [piece('top', 'Pale blue')] }),
    ).toBe('Quiet overall, and the pale blue top carries the most color.');
  });

  // A camera read far from every palette entry is described rather than
  // named (colorName), and the sentence has to survive that.
  it('names an off-palette read by its description', () => {
    const text = observationText({
      term: 'color',
      kind: 'colorful',
      pieces: [{ slot: 'top', hex: parseHex('#e0162b') }],
    });
    expect(text).toMatch(/^Plenty of color, and the [a-z ]+ top carries the most\.$/);
  });

  it('never uses the words the copy guidance rules out', () => {
    const texts = [
      CHECK_TITLE,
      observationText({ term: 'color', kind: 'neutral', pieces: [] }),
      observationText({ term: 'color', kind: 'colorful', pieces: [piece('top', 'Rust')] }),
      observationText({
        term: 'temperature',
        kind: 'mixed',
        pieces: [piece('top', 'Rust'), piece('bottom', 'Navy')],
      }),
      observationText({ term: 'lightness', kind: 'tonal', pieces: [] }),
    ];
    for (const text of texts) expect(text).not.toMatch(/\b(rate|rating|score|fix)\b/i);
  });
});
