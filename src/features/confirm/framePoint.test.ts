import { describe, expect, it } from 'vitest';
import { elementPoint, framePoint } from './framePoint';

describe('framePoint', () => {
  const rect = { left: 10, top: 20, width: 300, height: 400 };

  it('maps the middle of the element to the middle of the frame', () => {
    expect(framePoint(160, 220, rect, 640, 480)).toEqual({ x: 320, y: 240 });
  });

  // object-fit: cover on a landscape frame in a portrait box crops the sides.
  it('accounts for the crop of a landscape frame in a portrait element', () => {
    // scale = max(300/640, 400/480) = 0.8333; drawn width 533.3, so 116.7 px
    // of it hangs off each side. The element's left edge is frame x = 140.
    const p = framePoint(10, 220, rect, 640, 480)!;
    expect(p.x).toBeCloseTo(140, 0);
    expect(p.y).toBeCloseTo(240, 0);
  });

  it('accounts for the crop of a portrait frame in a landscape element', () => {
    const wide = { left: 0, top: 0, width: 400, height: 300 };
    const p = framePoint(200, 0, wide, 480, 640)!;
    expect(p.x).toBeCloseTo(240, 0);
    expect(p.y).toBeCloseTo(140, 0);
  });

  // Review focus 4.
  it('ignores points outside the element and an element with no size yet', () => {
    expect(framePoint(5, 220, rect, 640, 480)).toBeNull();
    expect(framePoint(0, 0, { left: 0, top: 0, width: 0, height: 0 }, 640, 480)).toBeNull();
  });
});

describe('elementPoint', () => {
  const rect = { left: 10, top: 20, width: 300, height: 400 };

  it('round-trips with framePoint: the frame point maps back to the tapped fraction', () => {
    const clientX = 160;
    const clientY = 220;
    const frame = framePoint(clientX, clientY, rect, 640, 480)!;
    const fraction = elementPoint(frame, rect, 640, 480)!;
    expect(fraction.left).toBeCloseTo((clientX - rect.left) / rect.width, 5);
    expect(fraction.top).toBeCloseTo((clientY - rect.top) / rect.height, 5);
  });

  it('round-trips a cropped tap too', () => {
    const clientX = 10;
    const clientY = 220;
    const frame = framePoint(clientX, clientY, rect, 640, 480)!;
    const fraction = elementPoint(frame, rect, 640, 480)!;
    expect(fraction.left).toBeCloseTo((clientX - rect.left) / rect.width, 5);
    expect(fraction.top).toBeCloseTo((clientY - rect.top) / rect.height, 5);
  });

  it('is null when the rect has no size', () => {
    expect(
      elementPoint({ x: 10, y: 10 }, { left: 0, top: 0, width: 0, height: 0 }, 640, 480),
    ).toBeNull();
  });
});
