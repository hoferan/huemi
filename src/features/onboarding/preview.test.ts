import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../color/palette';
import { composeOutfit } from '../../session/select';
import { PREVIEW_BASE, previewOutfit } from './preview';

describe('previewOutfit', () => {
  // The preview is a promise about the suggestions screen, so it is the
  // outfit that screen starts from for the same base, not one picked by hand.
  it('is the outfit the suggestions screen starts from', () => {
    const seeded = composeOutfit(PREVIEW_BASE, {}, () => 0);
    expect(previewOutfit()).toEqual({
      top: seeded.top?.hex,
      bottom: PREVIEW_BASE.hex,
      shoes: seeded.shoes?.hex,
    });
  });

  it('starts from a Light grey bottom', () => {
    expect(PREVIEW_BASE).toEqual({
      slot: 'bottom',
      hex: PALETTE.find((color) => color.name === 'Light grey')!.hex,
    });
  });

  it('suggests a top and shoes unlike the bottom and each other', () => {
    const { top, bottom, shoes } = previewOutfit();
    expect(new Set([top, bottom, shoes]).size).toBe(3);
  });
});
