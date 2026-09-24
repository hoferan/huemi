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

describe('framePoint, contain fit', () => {
  // A box taller than it is wide, the shape the confirm screen's unclear
  // state measures on a real 390x844 viewport (photo box 358x646), holding a
  // 320x240 landscape frame. scale = min(358/320, 646/240) = 1.11875; drawn
  // width is 320 * 1.11875 = 358, exactly the box's width, so nothing is
  // cropped or barred on that axis. Drawn height is 240 * 1.11875 = 268.5, so
  // a (646 - 268.5) / 2 = 188.75px bar sits above and below it.
  const tall = { left: 10, top: 20, width: 358, height: 646 };

  it('maps the element vertical centre-line into the frame, unlike cover', () => {
    const p = framePoint(10 + 179, 20 + 323, tall, 320, 240, 'contain')!;
    expect(p.x).toBeCloseTo(160, 0);
    expect(p.y).toBeCloseTo(120, 0);
  });

  it('returns null for a point in the letterbox bar', () => {
    expect(framePoint(10 + 179, 20 + 50, tall, 320, 240, 'contain')).toBeNull();
  });

  // Under cover the same tap would land at frame x = 140 (see the test
  // above): the left 140px of the frame are cropped off-screen. Under
  // contain nothing is cropped, so the element's own left edge is the
  // frame's left edge.
  it('maps the frame left edge to x = 0, uncropped', () => {
    const p = framePoint(10, 20 + 323, tall, 320, 240, 'contain')!;
    expect(p.x).toBeCloseTo(0, 1);
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

  it('round-trips with framePoint under contain, including through a letterbox bar', () => {
    const tall = { left: 10, top: 20, width: 358, height: 646 };
    const clientX = 10 + 40;
    const clientY = 20 + 300;
    const frame = framePoint(clientX, clientY, tall, 320, 240, 'contain')!;
    const fraction = elementPoint(frame, tall, 320, 240, 'contain')!;
    expect(fraction.left).toBeCloseTo((clientX - tall.left) / tall.width, 5);
    expect(fraction.top).toBeCloseTo((clientY - tall.top) / tall.height, 5);
  });
});
