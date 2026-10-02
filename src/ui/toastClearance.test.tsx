import { useRef, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOAST_EDGE, TOAST_GAP, clearOfToasts, toastLift, useToastLift } from './toastClearance';

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

// jsdom lays nothing out, so a marked region is given a box at the foot of
// jsdom's 768px window and everything else keeps the empty box it has.
function placeRegions(top: number, bottom: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const box = this.hasAttribute('data-toast-clearance') ? { top, bottom } : { top: 0, bottom: 0 };
    return { ...box, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: 0 } as DOMRect;
  });
}

function Probe() {
  const toast = useRef<HTMLParagraphElement>(null);
  const lift = useToastLift(toast);
  return <p ref={toast}>{`lift ${lift}`}</p>;
}

function Later() {
  const [shown, setShown] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setShown(true)}>
        Navigate
      </button>
      {shown && <div {...clearOfToasts} />}
      <Probe />
    </>
  );
}

describe('useToastLift', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lifts the toast over a region already on screen', () => {
    placeRegions(740, 768);
    render(
      <>
        <div {...clearOfToasts} />
        <Probe />
      </>,
    );
    expect(screen.getByText(`lift ${window.innerHeight - 740 + TOAST_GAP}`)).toBeInTheDocument();
  });

  // A toast outlives a route change, so the next screen's region arrives
  // while it is up.
  it('measures again when a region arrives under a toast already up', async () => {
    placeRegions(700, 768);
    const user = userEvent.setup();
    render(<Later />);
    expect(screen.getByText(`lift ${TOAST_EDGE}`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Navigate' }));
    await act(async () => {});
    expect(screen.getByText(`lift ${window.innerHeight - 700 + TOAST_GAP}`)).toBeInTheDocument();
  });
});
