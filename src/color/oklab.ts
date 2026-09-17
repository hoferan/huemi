import type { Hex } from '../model/hex';
import { hexToRgb } from './convert';

export type Oklab = [number, number, number];

const toLinear = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export function hexToOklab(hex: Hex): Oklab {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** Lightness 0-1, chroma 0-~0.4, hue 0-360 degrees. */
export type Oklch = { l: number; c: number; h: number };

/**
 * The polar reading of the same color. The engine reasons in lightness, chroma
 * and hue separately (ADR 0009), so it wants these named rather than the
 * cartesian a and b.
 *
 * Hue is meaningless as chroma approaches zero: Black and Grey both land at 90
 * here on rounding noise alone. Callers test neutrality before reading `h`.
 */
export function hexToOklch(hex: Hex): Oklch {
  const [l, a, b] = hexToOklab(hex);
  return {
    l,
    c: Math.hypot(a, b),
    h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  };
}

/** Perceptual distance. Replaces the prototype's RGB Euclidean metric. */
export function oklabDistance(a: Hex, b: Hex): number {
  const [l1, a1, b1] = hexToOklab(a);
  const [l2, a2, b2] = hexToOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
