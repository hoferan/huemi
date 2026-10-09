import { afterEach, describe, expect, it, vi } from 'vitest';
import { paint } from '../../../color/testing';
import { drawRegion } from './drawRegion';

// jsdom has no 2D context and no ImageData, so both are stood in for: what
// matters is that the frame goes down at its own size and the circle lands
// on the region in frame pixels.
describe('drawRegion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('draws the frame at its own size and rings the region', () => {
    vi.stubGlobal(
      'ImageData',
      class {
        constructor(
          readonly data: Uint8ClampedArray,
          readonly width: number,
          readonly height: number,
        ) {}
      },
    );
    const arcs: number[][] = [];
    const context = {
      putImageData: vi.fn(),
      beginPath: () => {},
      stroke: () => {},
      arc: (...args: number[]) => arcs.push(args.slice(0, 3)),
      lineWidth: 0,
      strokeStyle: '',
    };
    const canvas = { width: 0, height: 0, getContext: () => context };
    drawRegion(
      canvas as unknown as HTMLCanvasElement,
      paint(40, 30, () => [0, 0, 0]),
      {
        cx: 12,
        cy: 9,
        r: 5,
      },
    );
    expect([canvas.width, canvas.height]).toEqual([40, 30]);
    expect(context.putImageData).toHaveBeenCalledOnce();
    expect(arcs).toEqual([
      [12, 9, 5],
      [12, 9, 7],
    ]);
  });

  it('does nothing without a 2D context', () => {
    const canvas = { width: 0, height: 0, getContext: () => null };
    expect(() =>
      drawRegion(
        canvas as unknown as HTMLCanvasElement,
        paint(4, 4, () => [0, 0, 0]),
        {
          cx: 2,
          cy: 2,
          r: 1,
        },
      ),
    ).not.toThrow();
  });
});
