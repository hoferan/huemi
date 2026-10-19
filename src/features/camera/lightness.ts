import { LOW_LIGHT } from '../../color/lightness';

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
