import { parseHex, type Hex } from '../model/hex';
import { SLOT_LABELS, type Slot } from '../model/types';
import { oklabDistance } from './oklab';

export type NamedColor = { name: string; hex: Hex };

export const PALETTE: readonly NamedColor[] = [
  { name: 'Black', hex: parseHex('#1b1b1b') },
  { name: 'Charcoal', hex: parseHex('#3d3d3f') },
  { name: 'Grey', hex: parseHex('#8a8a8a') },
  { name: 'Light grey', hex: parseHex('#e6e5e2') },
  { name: 'White', hex: parseHex('#f7f6f3') },
  { name: 'Cream', hex: parseHex('#e9dfc9') },
  { name: 'Navy', hex: parseHex('#1f2a44') },
  { name: 'Denim', hex: parseHex('#4a6285') },
  { name: 'Pale blue', hex: parseHex('#a9bfd4') },
  { name: 'Forest', hex: parseHex('#2f4a3a') },
  { name: 'Olive', hex: parseHex('#6b6a3f') },
  { name: 'Khaki', hex: parseHex('#a89c78') },
  { name: 'Camel', hex: parseHex('#b58a5a') },
  { name: 'Tan', hex: parseHex('#c9ad86') },
  { name: 'Brown', hex: parseHex('#5a3e2e') },
  { name: 'Burgundy', hex: parseHex('#6b2733') },
  { name: 'Rust', hex: parseHex('#a4522d') },
  { name: 'Mustard', hex: parseHex('#c39a3a') },
];

/**
 * Nearest palette name by OKLab perceptual distance.
 *
 * OKLab provides perceptually uniform color distance, which is the appropriate
 * default for camera-read colors of unknown origin. The color name is the only
 * non-color channel available to users with color vision deficiency, making
 * naming accuracy an accessibility feature. For this palette of 18 muted colors,
 * RGB and OKLab distance metrics agree everywhere except where an input sits
 * between two palette entries; even there, margins are small and near-ties
 * are common. OKLab is chosen as the principled default rather than an
 * empirically superior alternative.
 */
export function nearestName(hex: Hex): string {
  let best = PALETTE[0]!;
  let bestDistance = oklabDistance(best.hex, hex);
  for (const candidate of PALETTE.slice(1)) {
    const d = oklabDistance(candidate.hex, hex);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best.name;
}

/**
 * The accessible name for a color block: "Top: Pale blue".
 * One implementation, so no screen invents its own.
 */
export function blockLabel(slot: Slot, hex: Hex): string {
  return `${SLOT_LABELS[slot]}: ${nearestName(hex)}`;
}
