import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDragDismiss } from './useDragDismiss';

function Probe({ onDismiss }: { onDismiss: () => void }) {
  const { offset, onPointerDown } = useDragDismiss({ onDismiss, height: () => 400 });
  return (
    <div data-testid="handle" onPointerDown={onPointerDown}>
      {offset}
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
