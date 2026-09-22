import { describe, expect, it } from 'vitest';
import { contrastOver, readableForeground } from '../color/contrast';
import { hslToHex } from '../color/convert';
import { BLOCK_TEXT_ALPHA } from './blockText';

describe('BLOCK_TEXT_ALPHA', () => {
  // readableForeground's #000/#fff pair clears 4.5:1 on every background,
  // but only just: A11Y.md records a worst case of 4.58:1, at luminance
  // 0.179. Compositing that foreground at any alpha below 1 moves it toward
  // the background and strictly reduces contrast, so no translucency is
  // safe everywhere the base color can land.
  //
  // The base color comes straight off the URL (useBaseParam calls parseHex
  // on an unvalidated parameter), not from the 18-swatch PALETTE, so the
  // domain here is the same continuous picker range contrast.test.ts sweeps,
  // not the palette: the palette's worst margin is wide enough that a
  // regression to opacity 0.9 would still pass it.
  it('reaches 4.5:1 everywhere in the picker range at BLOCK_TEXT_ALPHA', () => {
    for (let h = 0; h < 360; h += 15) {
      for (let s = 0; s <= 100; s += 20) {
        for (let l = 8; l <= 92; l += 4) {
          const bg = hslToHex(h, s, l);
          const fg = readableForeground(bg).color;
          expect(contrastOver(fg, bg, BLOCK_TEXT_ALPHA), bg).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
