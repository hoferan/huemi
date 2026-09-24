import { rgbToOklab } from '../../color/oklab';
import type { Pixels } from '../../model/frame';

/**
 * Mean OKLab lightness over a frame, 0 for black and 1 for white.
 *
 * OKLab rather than an RGB average because the question is how dark the
 * scene looks, and the engine already measures lightness this way. An empty
 * frame gives NaN, which `nextLowLight` treats as no reading at all.
 */
export function meanLightness({ data }: Pixels): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += rgbToOklab([data[i]!, data[i + 1]!, data[i + 2]!])[0];
  }
  return sum / (data.length / 4);
}

/**
 * When the viewfinder counts as too dark.
 *
 * Provisional. 0.25 is roughly sRGB 35 of 255, a dim wardrobe rather than a
 * dark room. Nothing measures yet how a color read degrades as light falls.
 * #20 is where that gets measured, and this is the number it should move.
 *
 * The margin and the sample count stop the banner flickering when a scene
 * sits near the line. It takes two readings in a row to cross in either
 * direction, and leaving the dark means clearing the threshold by the margin.
 */
export const LOW_LIGHT = { darkBelow: 0.25, margin: 0.05, samples: 2 } as const;

export type LowLight = { dark: boolean; streak: number };

export const initialLowLight: LowLight = { dark: false, streak: 0 };

export function nextLowLight(state: LowLight, lightness: number): LowLight {
  const crossing = state.dark
    ? lightness > LOW_LIGHT.darkBelow + LOW_LIGHT.margin
    : lightness < LOW_LIGHT.darkBelow;
  if (!crossing) return state.streak === 0 ? state : { ...state, streak: 0 };
  const streak = state.streak + 1;
  return streak >= LOW_LIGHT.samples ? { dark: !state.dark, streak: 0 } : { ...state, streak };
}
