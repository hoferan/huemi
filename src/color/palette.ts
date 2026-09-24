import { parseHex, type Hex } from '../model/hex';
import { SLOT_LABELS, type Slot } from '../model/types';
import { hexToOklch, oklabDistance } from './oklab';
import { isNeutral } from './classify';

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
 * The closest palette entry and how far away it was.
 *
 * OKLab provides perceptually uniform color distance, which is the appropriate
 * default for camera-read colors of unknown origin. For this palette of 18
 * muted colors, RGB and OKLab distance metrics agree everywhere except where an
 * input sits between two entries; even there, margins are small and near-ties
 * are common. OKLab is the principled default rather than an empirically
 * superior alternative.
 *
 * The distance comes out with the winner because the winner alone is not enough
 * to judge by: every input snaps to one of 18 entries whether or not any of
 * them is close. Callers that show a name to a user want `colorName` instead.
 */
export function nearestColor(hex: Hex): { color: NamedColor; distance: number } {
  let color = PALETTE[0]!;
  let distance = oklabDistance(color.hex, hex);
  for (const candidate of PALETTE) {
    const d = oklabDistance(candidate.hex, hex);
    if (d < distance) {
      color = candidate;
      distance = d;
    }
  }
  return { color, distance };
}

/**
 * Coarse hue words, anchored on where the sRGB primaries and secondaries land
 * in OKLab: red 29, orange 56, yellow 110, green 142, cyan 195, blue 264,
 * purple 296, magenta 328. Each number is the exclusive upper edge of the band
 * below it, and the band edges sit between the anchors.
 *
 * Pink closes the wheel at both ends, below 8 and above 318, so it is the
 * value a hue falls back to rather than an entry here.
 *
 * Eight words, because the fallback gets spoken aloud: "bright green" is
 * something a user can confirm, where "chartreuse" is not.
 */
const HUE_WORDS: readonly (readonly [number, string])[] = [
  [8, 'pink'],
  [40, 'red'],
  [75, 'orange'],
  [125, 'yellow'],
  [160, 'green'],
  [225, 'teal'],
  [285, 'blue'],
  [318, 'purple'],
];

/** Chroma at which a color reads as saturated rather than merely light or dark. */
const BRIGHT_CHROMA = 0.18;

/**
 * A description built from the color itself, for inputs no palette name fits.
 *
 * This is the honest answer where `nearestColor` would give a confident wrong
 * one. It deliberately carries less than a palette name, and it still carries
 * something: a user confirming a camera read can act on "bright green", where
 * "no close match" leaves them nothing to agree or disagree with. Lower case,
 * so a screen reader's output tells a description from one of the 18 names.
 */
export function describeColor(hex: Hex): string {
  const { l, c, h } = hexToOklch(hex);

  // hexToOklch documents that hue is noise as chroma approaches zero, so a
  // neutral is named by lightness alone rather than given a hue word.
  if (isNeutral(hex)) return l < 0.25 ? 'black' : l > 0.9 ? 'white' : 'grey';

  const word = HUE_WORDS.find(([edge]) => h < edge)?.[1] ?? 'pink';
  const modifier = c >= BRIGHT_CHROMA ? 'bright' : l < 0.4 ? 'dark' : l > 0.75 ? 'pale' : '';
  return modifier ? `${modifier} ${word}` : word;
}

/**
 * Past this OKLab distance from every palette entry, no palette name fits.
 *
 * The palette's own entries sit between 0.031 and 0.125 from their nearest
 * neighbour, so this is the widest gap the palette already tolerates between
 * two colors it considers distinct. An input further from every name than the
 * names are from each other is not in the palette's territory. Measured against
 * the four inputs in issue #37 the cutoff separates them cleanly: the nearest
 * miss is cyan at 0.156, and the furthest legitimate read is orange at 0.102.
 */
export const NAME_MAX_DISTANCE = 0.125;

/**
 * Below this chroma a color is named as a neutral.
 *
 * Wider than the engine's `NEUTRAL_CHROMA` of 0.02, because camera reads
 * carry a white-balance cast: a grey heather tee photographed indoors read at
 * 0.021. Cream is the palette's least saturated color at 0.031, and the line
 * sits far enough below it that Cream keeps its name after a camera-sized
 * nudge. At 0.03 it did not.
 */
const NAME_NEUTRAL_CHROMA = 0.025;

const namesAsNeutral = (hex: Hex): boolean => hexToOklch(hex).c < NAME_NEUTRAL_CHROMA;

/**
 * What to call a color, in a word a user can act on.
 *
 * A palette name where one fits, a description built from the color otherwise.
 * `nearestColor` answers which of 18 entries is closest and will answer even
 * when none is close; this decides whether that answer is worth saying.
 *
 * Neutrals are only named by neutrals, and colors only by colors. The palette
 * has no neutral between Grey and Light grey, so without this a white shirt in
 * shade was called Pale blue, and a lit dusky red was called Grey. Either way
 * the name stated a hue that was not there, or hid one that was.
 *
 * Neutrals are also exempt from the cutoff. OKLab lightness is steep at the
 * dark end, which puts pure black 0.222 from Black, further than yellow sits
 * from Cream. The cutoff exists to stop a wrong hue being stated as fact, and
 * between two neutrals there is no hue to get wrong.
 */
export function colorName(hex: Hex): string {
  const neutral = namesAsNeutral(hex);
  let best: NamedColor | null = null;
  let distance = Infinity;
  for (const candidate of PALETTE) {
    if (namesAsNeutral(candidate.hex) !== neutral) continue;
    const d = oklabDistance(candidate.hex, hex);
    if (d < distance) {
      best = candidate;
      distance = d;
    }
  }
  if (best && (neutral || distance <= NAME_MAX_DISTANCE)) return best.name;
  return describeColor(hex);
}

/**
 * The accessible name for a color block: "Top: Pale blue", or "Top: bright
 * green" where no palette name fits. One implementation, so no screen invents
 * its own.
 */
export function blockLabel(slot: Slot, hex: Hex): string {
  return `${SLOT_LABELS[slot]}: ${colorName(hex)}`;
}
