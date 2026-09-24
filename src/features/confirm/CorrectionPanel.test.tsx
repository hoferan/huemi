import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { colorName } from '../../color/palette';
import { rgbToHex } from '../../color/convert';
import { withLightness } from '../../color/oklab';
import { NAVY } from '../../color/testing';
import { parseHex } from '../../model/hex';
import { DISMISS_FRACTION } from '../../ui/useDragDismiss';
import { CorrectionPanel } from './CorrectionPanel';
import { CLOSER, LIGHTER_DARKER, NOT_QUITE } from './copy';

function renderPanel(overrides = {}) {
  const props = {
    id: 'panel',
    reading: parseHex('#4a6285'),
    selected: parseHex('#4a6285'),
    shift: 0,
    onSelect: vi.fn(),
    onShift: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<CorrectionPanel {...props} />);
  return props;
}

describe('CorrectionPanel', () => {
  it('offers the reading first, then four nearby colors, each by name', () => {
    renderPanel();
    const group = screen.getByRole('group', { name: CLOSER });
    const swatches = within(group).getAllByRole('button');
    expect(swatches).toHaveLength(5);
    expect(swatches[0]).toHaveAccessibleName('Denim');
    expect(swatches[0]).toHaveAttribute('aria-pressed', 'true');
  });

  // NAVY reads as #2b3a5c, which is named Navy but is not palette Navy, so
  // palette Navy is its nearest neighbour.
  it('never offers two swatches with the same name', () => {
    const navy = rgbToHex(NAVY);
    renderPanel({ reading: navy, selected: navy });
    const names = within(screen.getByRole('group', { name: CLOSER }))
      .getAllByRole('button')
      .map((swatch) => swatch.textContent);
    expect(names).toHaveLength(5);
    expect(new Set(names).size).toBe(5);
  });

  it('picks a swatch', async () => {
    const props = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Navy' }));
    expect(props.onSelect).toHaveBeenCalledWith(parseHex('#1f2a44'));
  });

  it('names the color the slider has reached', () => {
    renderPanel({ shift: 0.15 });
    const slider = screen.getByRole('slider', { name: LIGHTER_DARKER });
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      colorName(withLightness(parseHex('#4a6285'), 0.15)),
    );
  });

  it('reports slider movement as a lightness delta', () => {
    const props = renderPanel();
    fireEvent.change(screen.getByRole('slider', { name: LIGHTER_DARKER }), {
      target: { value: '0.05' },
    });
    expect(props.onShift).toHaveBeenCalledWith(0.05);
  });

  it('closes from the handle', async () => {
    const props = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  describe('dragged by its handle', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    // jsdom lays nothing out, so the panel's height is stated here. The drag
    // is slow, a second from press to release, so that only distance can
    // close it and a short drag is not mistaken for a flick.
    const height = 400;

    function drag(to: number) {
      vi.useFakeTimers();
      const props = renderPanel();
      Object.defineProperty(screen.getByRole('region', { name: NOT_QUITE }), 'offsetHeight', {
        value: height,
      });
      // bubbles: true, because React listens for pointerdown at its root; see
      // useDragDismiss.test.tsx.
      act(() => {
        screen.getByRole('button', { name: 'Close' }).dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 1,
            clientX: 0,
            clientY: 0,
            bubbles: true,
          }),
        );
      });
      vi.advanceTimersByTime(1000);
      act(() => {
        window.dispatchEvent(
          new PointerEvent('pointermove', { pointerId: 1, clientX: 0, clientY: to }),
        );
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      });
      return props;
    }

    it('closes past the dismiss fraction of its height', () => {
      expect(drag(height * DISMISS_FRACTION + 20).onClose).toHaveBeenCalledOnce();
    });

    // What makes the test above depend on the panel's own height: with none
    // measured, any downward drag would count as far enough.
    it('stays open short of it', () => {
      expect(drag(height * DISMISS_FRACTION - 20).onClose).not.toHaveBeenCalled();
    });
  });
});
