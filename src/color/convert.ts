import { parseHex, type Hex } from '../model/hex';

export type Rgb = [number, number, number];
/** Hue 0-360, saturation 0-100, lightness 0-100. */
export type Hsl = [number, number, number];

export function hexToRgb(hex: Hex): Rgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

const clampChannel = (v: number): number => Math.round(Math.max(0, Math.min(255, v)));

export function rgbToHex([r, g, b]: Rgb): Hex {
  const hex = [r, g, b].map((v) => clampChannel(v).toString(16).padStart(2, '0')).join('');
  return parseHex(`#${hex}`);
}

export function rgbToHsl([r, g, b]: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  return [h * 60, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): Hex {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return ln - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return rgbToHex([255 * f(0), 255 * f(8), 255 * f(4)]);
}
