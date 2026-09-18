import type { Hex } from '../model/hex';
import { parseHex } from '../model/hex';
import { hexToRgb, rgbToHex, type Rgb } from './convert';

// Exported so the contract with `tokens.fgDark`/`tokens.fgLight` (see
// ADR 0004) can be asserted directly in
// src/styles/tokens.stylex.test.ts, instead of only indirectly through
// readableForeground's output.
export const FG_DARK = parseHex('#000000');
export const FG_LIGHT = parseHex('#ffffff');

/** The luminance above which a swatch needs a border to read against the app background. */
const BORDER_THRESHOLD = 0.45;

/**
 * Opacity of the scrim pill.
 *
 * Contrast does not decide this number. The scrim branch is swept across the
 * picker range at 7:1, and its worst background clears that by 16.1:1, so the
 * constant could fall to roughly 0.35 before any background failed. What it
 * decides is how much of the garment shows through the pill, which is an
 * appearance judgement with no assertion behind it.
 *
 * The sweep therefore has a companion that pins the ratio at `#f50000`, the
 * worst background, so moving this constant fails a test and asks for a
 * reason rather than passing silently.
 */
const SCRIM_ALPHA = 0.85;

const channelLuminance = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export function relativeLuminance(hex: Hex): number {
  const [r, g, b] = hexToRgb(hex).map(channelLuminance) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Hex, b: Hex): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite `fg` over `bg` at `alpha`. The one alpha blend in this module. */
export function compositeOver(fg: Hex, bg: Hex, alpha: number): Hex {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return rgbToHex([
    f[0] * alpha + b[0] * (1 - alpha),
    f[1] * alpha + b[1] * (1 - alpha),
    f[2] * alpha + b[2] * (1 - alpha),
  ]);
}

/** Composite `fg` over `bg` at `alpha`, then measure against `bg`. */
export function contrastOver(fg: Hex, bg: Hex, alpha: number): number {
  return contrastRatio(compositeOver(fg, bg, alpha), bg);
}

export type Foreground =
  | { kind: 'direct'; color: Hex; ratio: number }
  | { kind: 'scrim'; color: Hex; scrim: string; ratio: number };

/**
 * Pick the readable foreground for a background.
 *
 * Selection is by comparing both ratios, never by thresholding luminance —
 * the prototype thresholds at 0.35 when the crossover is near 0.18, which is
 * why it fails on Grey, Camel and Khaki.
 *
 * With the #000/#fff pair the `scrim` branch is unreachable at the 4.5 floor
 * (worst case 4.58:1 at luminance 0.179). It exists so that a caller asking
 * for AAA cannot silently receive a failing color: the union forces the case
 * to be handled.
 */
export function readableForeground(bg: Hex, opts?: { minRatio?: number }): Foreground {
  const minRatio = opts?.minRatio ?? 4.5;
  const darkRatio = contrastRatio(FG_DARK, bg);
  const lightRatio = contrastRatio(FG_LIGHT, bg);
  const useDark = darkRatio >= lightRatio;
  const color = useDark ? FG_DARK : FG_LIGHT;
  const ratio = useDark ? darkRatio : lightRatio;

  if (ratio >= minRatio) return { kind: 'direct', color, ratio };

  // Back the text with a near-opaque pill of the opposite endpoint, so the
  // effective background no longer depends on the garment color.
  const backing = useDark ? FG_LIGHT : FG_DARK;
  const [sr, sg, sb] = hexToRgb(backing);
  return {
    kind: 'scrim',
    color,
    scrim: `rgba(${sr}, ${sg}, ${sb}, ${SCRIM_ALPHA})`,
    ratio: contrastRatio(color, compositeOver(backing, bg, SCRIM_ALPHA)),
  };
}

/**
 * Whether a swatch needs a hairline border to separate it from the app
 * background. A contrast affordance, not decoration: without it White, Cream
 * and Light grey vanish into #d8d5cf.
 */
export function needsBorder(bg: Hex): boolean {
  return relativeLuminance(bg) > BORDER_THRESHOLD;
}
