import { describe, expect, it } from 'vitest';
import { busy, NAVY, paint, solid, WHITE } from '../../../color/testing';
import { colorsIn } from '../../../color/read';
import { parseHex } from '../../../model/hex';
import { readingRun, shotOf, type Answer, type ReadingState, type Shot } from './readingRunState';

const PIXELS = { width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255]) };

const single: Shot = {
  pixels: PIXELS,
  lowLight: false,
  shown: parseHex('#1f2a44'),
  kind: 'single',
};
const several: Shot = { ...single, kind: 'several' };

const answer = (n: number, shot: Shot = single): Answer => ({
  captureId: `c${n}`,
  verdict: 'right',
  truth: shot.shown,
  shot,
});

const started = readingRun({ step: 'setup' }, { type: 'start', length: 20, light: 'lamp' });

describe('readingRun', () => {
  it('starts on the camera with no answers', () => {
    expect(started).toEqual({ step: 'capture', length: 20, light: 'lamp', answers: [] });
  });

  it('votes on a single reading, then goes back to the camera with the answer', () => {
    const voting = readingRun(started, { type: 'shot', shot: single });
    expect(voting).toEqual({ ...started, step: 'vote', shot: single });
    // The answer is the save's: Yes changes nothing until it comes back.
    const yes = readingRun(voting, { type: 'yes' });
    expect(yes).toBe(voting);
    const next = readingRun(yes, { type: 'answered', answer: answer(1) });
    expect(next).toEqual({ ...started, step: 'capture', answers: [answer(1)] });
  });

  it('skips the vote for a reading that is not single', () => {
    expect(readingRun(started, { type: 'shot', shot: several })).toEqual({
      ...started,
      step: 'correct',
      shot: several,
    });
    const unclear: Shot = { ...single, kind: 'unclear' };
    expect(readingRun(started, { type: 'shot', shot: unclear })).toMatchObject({
      step: 'correct',
    });
  });

  it('corrects after No, and opens the sliders from None of these', () => {
    const voting = readingRun(started, { type: 'shot', shot: single });
    const correcting = readingRun(voting, { type: 'no' });
    expect(correcting).toEqual({ ...voting, step: 'correct' });
    expect(readingRun(correcting, { type: 'noneOfThese' })).toEqual({
      ...voting,
      step: 'sliders',
    });
  });

  it('goes back from the correction to the vote for a single reading only', () => {
    const correcting = readingRun(readingRun(started, { type: 'shot', shot: single }), {
      type: 'no',
    });
    expect(readingRun(correcting, { type: 'back' })).toMatchObject({ step: 'vote' });
    const noVote = readingRun(started, { type: 'shot', shot: several });
    expect(readingRun(noVote, { type: 'back' })).toBe(noVote);
  });

  it('ends on the summary at the last answer', () => {
    let state: ReadingState = started;
    for (let n = 1; n <= 20; n++) {
      state = readingRun(state, { type: 'shot', shot: single });
      state = readingRun(state, { type: 'answered', answer: answer(n) });
    }
    expect(state).toMatchObject({ step: 'summary', length: 20, light: 'lamp' });
    expect(state.step === 'summary' && state.answers).toHaveLength(20);
  });

  it('undoes from the camera back to the last vote with its shot', () => {
    const first = readingRun(readingRun(started, { type: 'shot', shot: single }), {
      type: 'answered',
      answer: answer(1),
    });
    const other: Shot = { ...single, shown: parseHex('#aa3322') };
    const second = readingRun(readingRun(first, { type: 'shot', shot: other }), {
      type: 'answered',
      answer: answer(2, other),
    });
    expect(readingRun(second, { type: 'undo' })).toEqual({
      ...started,
      step: 'vote',
      shot: other,
      answers: [answer(1)],
    });
  });

  it('undoes a reading that was not single back to its correction', () => {
    const done = readingRun(readingRun(started, { type: 'shot', shot: several }), {
      type: 'answered',
      answer: answer(1, several),
    });
    expect(readingRun(done, { type: 'undo' })).toEqual({
      ...started,
      step: 'correct',
      shot: several,
      answers: [],
    });
  });

  it('undoes from the summary back to the last vote', () => {
    let state: ReadingState = readingRun(
      { step: 'setup' },
      { type: 'start', length: 10, light: 'dim' },
    );
    for (let n = 1; n <= 10; n++) {
      state = readingRun(state, { type: 'shot', shot: single });
      state = readingRun(state, { type: 'answered', answer: answer(n) });
    }
    const undone = readingRun(state, { type: 'undo' });
    expect(undone).toMatchObject({ step: 'vote', shot: single, length: 10, light: 'dim' });
    expect(undone.step === 'vote' && undone.answers).toHaveLength(9);
  });

  it('ignores Undo with no answers', () => {
    expect(readingRun(started, { type: 'undo' })).toBe(started);
  });

  it('starts again from the summary', () => {
    let state: ReadingState = readingRun(
      { step: 'setup' },
      { type: 'start', length: 10, light: 'dim' },
    );
    for (let n = 1; n <= 10; n++) {
      state = readingRun(state, { type: 'shot', shot: single });
      state = readingRun(state, { type: 'answered', answer: answer(n) });
    }
    expect(readingRun(state, { type: 'again' })).toEqual({ step: 'setup' });
  });

  it('ignores an action its step has no use for', () => {
    expect(readingRun(started, { type: 'yes' })).toBe(started);
    expect(readingRun(started, { type: 'answered', answer: answer(1) })).toBe(started);
    expect(readingRun({ step: 'setup' }, { type: 'shot', shot: single })).toEqual({
      step: 'setup',
    });
    const voting = readingRun(started, { type: 'shot', shot: single });
    expect(readingRun(voting, { type: 'undo' })).toBe(voting);
    expect(readingRun(voting, { type: 'start', length: 10, light: 'dim' })).toBe(voting);
  });
});

describe('shotOf', () => {
  it('shows the color of a single reading', () => {
    const pixels = solid(NAVY);
    const shot = shotOf(pixels, true);
    expect(shot).toEqual({
      pixels,
      lowLight: true,
      kind: 'single',
      shown: colorsIn(pixels)[0]!.color,
    });
  });

  it('shows the largest color of a striped garment', () => {
    const pixels = paint(100, 100, (_, y) => (y % 10 < 6 ? NAVY : WHITE));
    const shot = shotOf(pixels, false);
    expect(shot.kind).toBe('several');
    expect(shot.shown).toBe(colorsIn(pixels)[0]!.color);
  });

  it('shows the largest color of a busy frame', () => {
    const pixels = paint(100, 100, busy);
    const shot = shotOf(pixels, null);
    expect(shot.kind).toBe('unclear');
    expect(shot.shown).toBe(colorsIn(pixels)[0]!.color);
  });

  it('shows a mid grey for a frame with nothing to read', () => {
    const shot = shotOf({ width: 0, height: 0, data: new Uint8ClampedArray() }, false);
    expect(shot).toMatchObject({ kind: 'unclear', shown: '#808080' });
  });
});
