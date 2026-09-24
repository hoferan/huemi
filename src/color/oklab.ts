import type { Hex } from '../model/hex';
import { hexToRgb, rgbToHex, type Rgb } from './convert';

export type Oklab = [number, number, number];

const toLinear = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** From 8-bit sRGB channels, for pixels that never were a hex. */
export function rgbToOklab(rgb: Rgb): Oklab {
  const [r, g, b] = rgb.map(toLinear) as [number, number, number];

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

const toSrgb = (v: number): number => {
  const c = Math.max(0, Math.min(1, v));
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
};

/**
 * Back to 8-bit sRGB channels, unrounded.
 *
 * A median taken one channel at a time can land outside sRGB, so linear
 * values are clamped before the transfer curve. A negative value raised to
 * 1/2.4 would otherwise be NaN.
 */
export function oklabToRgb([l, a, b]: Oklab): Rgb {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lc = l_ ** 3;
  const mc = m_ ** 3;
  const sc = s_ ** 3;

  return [
    toSrgb(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc),
    toSrgb(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc),
    toSrgb(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc),
  ];
}

export function hexToOklab(hex: Hex): Oklab {
  return rgbToOklab(hexToRgb(hex));
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

/**
 * The same color, lighter or darker by `delta` in OKLab lightness.
 *
 * What the confirm screen's slider moves. OKLab rather than HSL lightness,
 * because HSL's steps are not perceptually even and shift the apparent hue of
 * a dark blue as it lightens. Lightness is clamped to 0–1 and the channels by
 * `oklabToRgb` and `rgbToHex`, so the ends of the slider on a color that is
 * already near white or black give white or black, never an invalid hex.
 */
export function withLightness(hex: Hex, delta: number): Hex {
  const [l, a, b] = hexToOklab(hex);
  return rgbToHex(oklabToRgb([Math.max(0, Math.min(1, l + delta)), a, b]));
}
