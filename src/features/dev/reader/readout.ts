import { colorName } from '../../../color/palette';
import {
  READ_TUNING,
  colorsIn,
  explain,
  type ColorReading,
  type ColorShare,
  type Decision,
  type Region,
} from '../../../color/read';
import type { Pixels } from '../../../model/frame';
import { LOW_LIGHT, meanLightness } from '../../camera/lightness';

/**
 * What the reader saw in one region, for the harness's Read mode and the
 * confirm screen's reader panel. The verdict comes from `explain`, the
 * function `readColor` decides with, so neither view can disagree with the
 * reading it explains.
 */
export type Readout = { found: ColorShare[]; decision: Decision; lightness: number };

export function readout(pixels: Pixels, region: Region): Readout {
  const found = colorsIn(pixels, region);
  return { found, decision: explain(found), lightness: meanLightness(pixels) };
}

export const fmt = (n: number): string => n.toFixed(2);

export function verdictText(reading: ColorReading): string {
  switch (reading.kind) {
    case 'single':
      return `single · ${colorName(reading.color)}`;
    case 'several':
      return `several · ${reading.colors.map((c) => colorName(c.color)).join(', ')}`;
    case 'unclear':
      return 'unclear';
  }
}

const atLeast = (value: number, min: number) => (value >= min ? '≥' : '<');

export function ruleText({ rule, largest, parts, covered }: Decision): string {
  const { singleMin, partMin, coveredMin } = READ_TUNING;
  switch (rule) {
    case 'nothing':
      return 'nothing sampled';
    case 'singleMin':
      return `largest ${fmt(largest)} ≥ single ${singleMin}`;
    case 'partMin':
      return `largest ${fmt(largest)} < single ${singleMin} · ${parts} part${parts === 1 ? '' : 's'} ≥ ${partMin}`;
    case 'coveredMin':
      return `${parts} parts cover ${fmt(covered)} ${atLeast(covered, coveredMin)} ${coveredMin}`;
  }
}

/** `lowLight` is what the viewfinder decided, or null for an uploaded photo. */
export function lightText(lightness: number, lowLight: boolean | null): string {
  const viewfinder =
    lowLight === null ? 'uploaded photo' : `viewfinder ${lowLight ? 'dark' : 'not dark'}`;
  return `mean lightness ${fmt(lightness)} · dark below ${LOW_LIGHT.darkBelow} · ${viewfinder}`;
}
