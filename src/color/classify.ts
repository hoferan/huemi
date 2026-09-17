import type { Hex } from '../model/hex';
import { hexToOklab } from './oklab';

/**
 * Below this OKLab chroma a color reads as a neutral regardless of hue.
 *
 * The palette's five greys all sit under 0.005 and its least chromatic color,
 * Cream, sits at 0.031, so the cutoff has room on both sides. HSL saturation
 * cannot do this job: it diverges as lightness approaches either extreme, which
 * put White at saturation 20 and Light grey at 7.4 despite identical chroma.
 * See ADR 0009.
 */
const NEUTRAL_CHROMA = 0.02;

/** Warm hues run from WARM_FROM up through 0 to WARM_TO, in OKLab degrees. */
const WARM_FROM = 320;
const WARM_TO = 130;

function hueDegrees(a: number, b: number): number {
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

export function chroma(hex: Hex): number {
  const [, a, b] = hexToOklab(hex);
  return Math.hypot(a, b);
}

export function isNeutral(hex: Hex): boolean {
  return chroma(hex) < NEUTRAL_CHROMA;
}

export function temperature(hex: Hex): 'warm' | 'cool' | 'neutral' {
  const [, a, b] = hexToOklab(hex);
  if (Math.hypot(a, b) < NEUTRAL_CHROMA) return 'neutral';
  const hue = hueDegrees(a, b);
  return hue >= WARM_FROM || hue < WARM_TO ? 'warm' : 'cool';
}
