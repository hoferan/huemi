import {
  measureOutfit,
  type MeasuredPiece,
  type Observation,
  type WornPiece,
  type WornPieces,
} from '../../../color/check';
import { colorName } from '../../../color/palette';
import { SLOT_LABELS } from '../../../model/types';
import { fmt } from '../reader/readout';
import { sideBySide } from './format';

export type CheckReadout = { observations: string[]; pieces: string[] };

const chromaText = (value: number): string => value.toFixed(3);

/** "Navy bottom": a piece's color and its slot. */
const phrase = (piece: WornPiece): string =>
  `${colorName(piece.hex)} ${SLOT_LABELS[piece.slot].toLowerCase()}`;

function observationLine(
  observation: Observation,
  load: number,
  budget: number,
  gap: number,
  limit: number,
  measured: MeasuredPiece[],
): string {
  const colored = measured.filter((piece) => !piece.namedNeutral);
  const [loadText, budgetText] = sideBySide(load, budget, 3);
  const chromaLine = `chroma ${loadText} ${load > budget ? 'over' : 'of'} ${budgetText}`;
  const [gapText, limitText] = sideBySide(gap, limit, 2);
  switch (observation.term) {
    case 'color': {
      if (observation.kind === 'neutral') {
        return `neutral: every piece is named as a neutral · ${chromaLine}`;
      }
      const [heaviest] = observation.pieces;
      const carried = measured.find((piece) => piece.slot === heaviest.slot)!.carried;
      return `${observation.kind}: ${chromaLine} · most from ${phrase(heaviest)} (${chromaText(carried)})`;
    }
    // A mixed sentence names the heaviest warm piece and the heaviest cool
    // one, so every colored piece shows the color it carries.
    case 'temperature':
      return `${observation.kind}: ${colored
        .map((piece) => `${phrase(piece)} ${piece.temperature} (${chromaText(piece.carried)})`)
        .join(' · ')}`;
    case 'lightness':
      if (observation.kind === 'tonal') return `tonal: gap ${gapText} within ${limitText}`;
      return `contrast: gap ${gapText} over ${limitText} · ${phrase(observation.pieces[0])} to ${phrase(observation.pieces[1])}`;
  }
}

/**
 * The check's sentences as numbers, for the engine panel on the result
 * screen. One line per observation, in the order the screen shows them, each
 * with the measurement and the threshold behind it from `measureOutfit`; then
 * one line per piece, head to toe.
 */
export function checkReadout(pieces: WornPieces, observations: Observation[]): CheckReadout {
  const measures = measureOutfit(pieces);
  if (!measures) return { observations: [], pieces: [] };
  const { load, budget, lightnessGap, tonalLimit, pieces: measured } = measures;
  return {
    observations: observations.map((observation) =>
      observationLine(observation, load, budget, lightnessGap, tonalLimit, measured),
    ),
    pieces: measured.map(
      (piece) =>
        `${SLOT_LABELS[piece.slot]} · ${colorName(piece.hex)} · L ${fmt(piece.lightness)} · C ${chromaText(piece.chroma)} · carries ${chromaText(piece.carried)} · ${piece.temperature}${piece.namedNeutral ? ' · named neutral' : ''}`,
    ),
  };
}
