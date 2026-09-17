import type { Hex } from '../model/hex';
import { hexToRgb, rgbToHsl } from './convert';

/** Below this HSL saturation a color reads as a neutral regardless of hue. */
const NEUTRAL_SATURATION = 14;

export function saturation(hex: Hex): number {
  return rgbToHsl(hexToRgb(hex))[1];
}

export function isNeutral(hex: Hex): boolean {
  return saturation(hex) < NEUTRAL_SATURATION;
}

export function temperature(hex: Hex): 'warm' | 'cool' | 'neutral' {
  if (isNeutral(hex)) return 'neutral';
  const [hue] = rgbToHsl(hexToRgb(hex));
  return hue < 70 || hue > 320 ? 'warm' : 'cool';
}
