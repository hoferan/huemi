import { colorsIn, explain, type ColorReading } from '../../../color/read';
import type { Light, Verdict } from '../../../model/field';
import type { Pixels } from '../../../model/frame';
import { parseHex, type Hex } from '../../../model/hex';
import type { RunLength } from './RunSetup';

/**
 * One shutter press: the frame, the low-light warning at the shutter, what
 * kind of reading it gave, and the color the run shows for it. That is the
 * reading's color when it is single. For several and unclear it is the
 * largest color the reader found, which is where a correction starts.
 */
export type Shot = {
  pixels: Pixels;
  lowLight: boolean | null;
  shown: Hex;
  kind: ColorReading['kind'];
};

/**
 * A saved answer. `truth` is what the capture stores as `settled`: the shown
 * color after Yes, the picked one after a correction, and null after Skip.
 * The shot stays in memory with it, for Undo and the summary's thumbnails.
 */
export type Answer = { captureId: string; verdict: Verdict; truth: Hex | null; shot: Shot };

type Run = { length: RunLength; light: Light; answers: Answer[] };

export type ReadingState =
  | { step: 'setup' }
  | ({ step: 'capture' } & Run)
  | ({ step: 'vote' | 'correct' | 'sliders'; shot: Shot } & Run)
  | ({ step: 'summary' } & Run);

export type ReadingAction =
  | { type: 'start'; length: RunLength; light: Light }
  | { type: 'shot'; shot: Shot }
  | { type: 'yes' }
  | { type: 'no' }
  | { type: 'noneOfThese' }
  | { type: 'back' }
  | { type: 'answered'; answer: Answer }
  | { type: 'undo' }
  | { type: 'again' };

// What a frame with no samples at all shows, where `colorsIn` finds nothing.
// Only an empty frame does that, and the camera never gives one. Mid grey has
// no hue and sits halfway up the lightness scale, so a correction starting
// from it leans toward no answer.
const NOTHING_READ = parseHex('#808080');

/** What the run shows for a frame: the reader's verdict and the color to put beside it. */
export function shotOf(pixels: Pixels, lowLight: boolean | null): Shot {
  const found = colorsIn(pixels);
  const { reading } = explain(found);
  const shown = reading.kind === 'single' ? reading.color : (found[0]?.color ?? NOTHING_READ);
  return { pixels, lowLight, shown, kind: reading.kind };
}

/** The step a shot is answered from: a vote for a single reading, a correction otherwise. */
const answering = (shot: Shot): 'vote' | 'correct' => (shot.kind === 'single' ? 'vote' : 'correct');

/**
 * The reading run's steps. The screen does the saving: Yes, "Use this color"
 * and Skip each save a capture, and `answered` arrives only once the store
 * has it, so the run never counts an answer that is not in the set. `yes` is
 * therefore no step of its own, and leaves the vote where it is. Undo
 * likewise arrives after the capture is deleted, and goes back to where that
 * shot was answered. An action a step has no use for leaves the state alone.
 */
export function readingRun(state: ReadingState, action: ReadingAction): ReadingState {
  switch (action.type) {
    case 'start':
      if (state.step !== 'setup') return state;
      return { step: 'capture', length: action.length, light: action.light, answers: [] };
    case 'shot':
      if (state.step !== 'capture') return state;
      return { ...state, step: answering(action.shot), shot: action.shot };
    case 'yes':
      return state;
    case 'no':
      if (state.step !== 'vote') return state;
      return { ...state, step: 'correct' };
    case 'noneOfThese':
      if (state.step !== 'correct') return state;
      return { ...state, step: 'sliders' };
    case 'back':
      // From the sliders back to the swatches. From the swatches, only a
      // single reading had a vote to go back to.
      if (state.step === 'sliders') return { ...state, step: 'correct' };
      if (state.step !== 'correct' || state.shot.kind !== 'single') return state;
      return { ...state, step: 'vote' };
    case 'answered': {
      if (state.step !== 'vote' && state.step !== 'correct' && state.step !== 'sliders') {
        return state;
      }
      const { length, light } = state;
      const answers = [...state.answers, action.answer];
      return answers.length === length
        ? { step: 'summary', length, light, answers }
        : { step: 'capture', length, light, answers };
    }
    case 'undo': {
      if (state.step !== 'capture' && state.step !== 'summary') return state;
      const last = state.answers.at(-1);
      if (!last) return state;
      const { length, light } = state;
      return {
        step: answering(last.shot),
        shot: last.shot,
        length,
        light,
        answers: state.answers.slice(0, -1),
      };
    }
    case 'again':
      return state.step === 'summary' ? { step: 'setup' } : state;
  }
}
