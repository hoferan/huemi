import type { Pixels } from '../model/frame';
import type { Rgb } from './convert';

/**
 * Painted frames for tests of anything that reads pixels: the reader here, and
 * the confirm screen that shows what it read. Not imported by application
 * code, so nothing here reaches the bundle.
 */

export function paint(width: number, height: number, at: (x: number, y: number) => Rgb): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = at(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

export const NAVY: Rgb = [43, 58, 92];
export const WHITE: Rgb = [236, 235, 230];
export const RUST: Rgb = [168, 65, 58];
export const OLIVE: Rgb = [93, 107, 82];
export const BEIGE: Rgb = [185, 173, 154];
export const CHARCOAL: Rgb = [58, 54, 51];
export const MUSTARD: Rgb = [217, 195, 138];

export const solid = (rgb: Rgb, size = 100) => paint(size, size, () => rgb);

// Five colors in 8px squares, none covering more than a fifth.
export const busy = (x: number, y: number): Rgb =>
  [BEIGE, OLIVE, RUST, CHARCOAL, MUSTARD][(Math.floor(x / 8) + 2 * Math.floor(y / 8)) % 5]!;
