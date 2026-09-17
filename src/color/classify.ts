import type { Hex } from '../model/hex';
import { hexToOklch } from './oklab';

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

export function chroma(hex: Hex): number {
  return hexToOklch(hex).c;
}

export function isNeutral(hex: Hex): boolean {
  return chroma(hex) < NEUTRAL_CHROMA;
}

export function temperature(hex: Hex): 'warm' | 'cool' | 'neutral' {
  const { c, h } = hexToOklch(hex);
  if (c < NEUTRAL_CHROMA) return 'neutral';
  return h >= WARM_FROM || h < WARM_TO ? 'warm' : 'cool';
}
