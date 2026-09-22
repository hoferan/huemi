import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDragDismiss } from './useDragDismiss';

// What `dragged()` reported, in order. It is a ref inside the hook, so there
// is nothing to assert from outside except what a click actually reads, which
// is the only moment its value matters.
const reported: boolean[] = [];

function Probe({ onDismiss }: { onDismiss: () => void }) {
  const { offset, onPointerDown, dragged } = useDragDismiss({ onDismiss, height: () => 400 });
  return (
    <div data-testid="handle" onPointerDown={onPointerDown}>
      {offset}
      <button
        type="button"
        onClick={() => {
          reported.push(dragged());
        }}
      >
        read
      </button>
    </div>
  );
}

function press(x: number, y: number) {
  // bubbles: true, because React delegates pointerdown from a root above the
  // probe's div; a synthetic event dispatched without it would never reach
  // the handler, the same reason useBlockGestures.test.tsx sets it too.
  const event = new PointerEvent('pointerdown', {
    pointerId: 1,
    clientX: x,
    clientY: y,
    bubbles: true,
  });
  act(() => {
    screen.getByTestId('handle').dispatchEvent(event);
  });
}

function moveTo(x: number, y: number) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: x, clientY: y }));
  });
}

function release() {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
  });
}

describe('useDragDismiss', () => {
  it('dismisses when the drag passes a quarter of the height', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    press(0, 0);
    moveTo(0, 120);
    release();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('springs back from a short slow drag', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    press(0, 0);
    vi.advanceTimersByTime(500);
    moveTo(0, 40);
    release();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('handle')).toHaveTextContent('0');
    vi.useRealTimers();
  });

  // Without this a quick downward flick leaves the sheet sitting open, which
  // is the one gesture people reach for first.
  it('dismisses on a short fast flick', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    press(0, 0);
    moveTo(0, 60);
    release();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  // The same lesson as useBlockGestures: the prototype read clientX and never
  // clientY, so scrolling changed colours under the finger. Here it is the
  // other axis, and a horizontal swipe must not close the sheet.
  it('ignores a drag whose horizontal movement dominates', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    press(0, 0);
    moveTo(200, 120);
    release();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('ignores an upward drag', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    press(0, 200);
    moveTo(0, 20);
    release();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('handle')).toHaveTextContent('0');
  });
});

// The handle the drag hangs off is also the tap-to-close control, so whatever
// the drag decided, the press still ends in a click. The hook is what knows
// which of the two happened.
describe('useDragDismiss: telling a drag from a tap', () => {
  beforeEach(() => {
    reported.length = 0;
  });

  function read() {
    fireEvent.click(screen.getByRole('button', { name: 'read' }));
  }

  it('reports a press that did not move as a tap', () => {
    render(<Probe onDismiss={vi.fn()} />);
    press(0, 0);
    release();
    read();
    expect(reported).toEqual([false]);
  });

  it('forgives the wobble in a real thumb', () => {
    render(<Probe onDismiss={vi.fn()} />);
    press(0, 0);
    moveTo(1, 2);
    release();
    read();
    expect(reported).toEqual([false]);
  });

  // The gesture this whole flag exists for: down, far enough to spring back,
  // then back up and released. Nothing dismissed, and the click that follows
  // must not close the sheet either.
  it('reports a drag that sprang back as a drag', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    press(0, 0);
    moveTo(0, 30);
    moveTo(0, 0);
    release();
    expect(onDismiss).not.toHaveBeenCalled();
    read();
    expect(reported).toEqual([true]);
  });

  it('reports a sideways drag as a drag', () => {
    render(<Probe onDismiss={vi.fn()} />);
    press(0, 0);
    moveTo(60, 0);
    release();
    read();
    expect(reported).toEqual([true]);
  });

  // One drag suppresses one click. A drag released off the handle puts its
  // click elsewhere, and the flag must not still be standing the next time the
  // handle is activated by keyboard.
  it('reports the drag once', () => {
    render(<Probe onDismiss={vi.fn()} />);
    press(0, 0);
    moveTo(0, 30);
    moveTo(0, 0);
    release();
    read();
    read();
    expect(reported).toEqual([true, false]);
  });

  it('forgets a drag once the next press starts', () => {
    render(<Probe onDismiss={vi.fn()} />);
    press(0, 0);
    moveTo(0, 30);
    moveTo(0, 0);
    release();
    press(0, 0);
    release();
    read();
    expect(reported).toEqual([false]);
  });
});
