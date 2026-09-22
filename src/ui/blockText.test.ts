import { describe, expect, it } from 'vitest';
import { contrastOver, readableForeground } from '../color/contrast';
import { PALETTE } from '../color/palette';
import { BLOCK_TEXT_ALPHA } from './blockText';

describe('BLOCK_TEXT_ALPHA', () => {
  // readableForeground's #000/#fff pair clears 4.5:1 on every background,
  // but only just: A11Y.md records a worst case of 4.58:1, at luminance
  // 0.179. Compositing that foreground at any alpha below 1 moves it toward
  // the background and strictly reduces contrast, so no translucency is
  // safe on every palette color. This sweep pins the constant at 1 so
  // reintroducing opacity on block text fails here instead of in an axe
  // scan.
  it.each(PALETTE)('reaches 4.5:1 on $name at BLOCK_TEXT_ALPHA', ({ hex }) => {
    const fg = readableForeground(hex).color;
    expect(contrastOver(fg, hex, BLOCK_TEXT_ALPHA)).toBeGreaterThanOrEqual(4.5);
  });
});
