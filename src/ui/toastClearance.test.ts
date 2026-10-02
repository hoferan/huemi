import { describe, expect, it } from 'vitest';
import { TOAST_EDGE, TOAST_GAP, toastLift } from './toastClearance';

const VIEWPORT = 800;
const TOAST = 52;
const box = (top: number, bottom: number) => ({ top, bottom });

describe('toastLift', () => {
  it('leaves the toast at the edge when nothing is marked', () => {
    expect(toastLift(TOAST, [], VIEWPORT)).toBe(TOAST_EDGE);
  });

  it('floats the toast above a region at the foot of the screen', () => {
    expect(toastLift(TOAST, [box(740, 790)], VIEWPORT)).toBe(VIEWPORT - 740 + TOAST_GAP);
  });

  it('clears the highest of several regions', () => {
    const lift = toastLift(TOAST, [box(760, 790), box(700, 750)], VIEWPORT);
    expect(lift).toBe(VIEWPORT - 700 + TOAST_GAP);
  });

  // A region higher up the screen is somewhere the toast never reaches, so
  // lifting over it would put the toast in the middle of the screen for
  // nothing.
  it('ignores a region above the band the toast covers', () => {
    expect(toastLift(TOAST, [box(100, 400)], VIEWPORT)).toBe(TOAST_EDGE);
  });

  it('ignores a region scrolled out of view below the screen', () => {
    expect(toastLift(TOAST, [box(900, 950)], VIEWPORT)).toBe(TOAST_EDGE);
  });

  // A region that fills most of the screen would otherwise push the toast off
  // the top, where nobody would see it.
  it('keeps the toast on screen however tall the region', () => {
    expect(toastLift(TOAST, [box(20, 790)], VIEWPORT)).toBe(VIEWPORT - TOAST - TOAST_EDGE);
  });
});
