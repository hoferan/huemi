import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Pixels } from '../../model/frame';
import { tokens } from '../../styles/tokens.stylex';
import { elementPoint, framePoint, type Fit, type Rect } from './framePoint';

const styles = stylex.create({
  // No overflow clipping here either, for the same reason as Camera.tsx's
  // viewfinder: the 200% text-size check in e2e/invariants.spec.ts fails any
  // element that hides its own overflow.
  wrap: { position: 'relative', flex: '1', minHeight: 0, display: 'flex' },
  photo: {
    display: 'block',
    width: '100%',
    height: '100%',
    minHeight: 0,
    borderRadius: tokens.radius,
    // Kept dark rather than left to the page background: under `contain`
    // this is what makes the letterbox bars read as part of the photo's own
    // frame, not a gap in the layout.
    backgroundColor: tokens.dark,
  },
  cover: { objectFit: 'cover' },
  contain: { objectFit: 'contain' },
  tappable: { cursor: 'crosshair', touchAction: 'manipulation' },
  mark: (x: string, y: string) => ({
    position: 'absolute',
    left: x,
    top: y,
    width: '28px',
    height: '28px',
    marginLeft: '-14px',
    marginTop: '-14px',
    borderRadius: '50%',
    borderWidth: '3px',
    borderStyle: 'solid',
    borderColor: tokens.darkFg,
    boxShadow: `0 0 0 2px ${tokens.dark}`,
    pointerEvents: 'none',
  }),
});

const zeroRect: Rect = { left: 0, top: 0, width: 0, height: 0 };

/**
 * The frame the user captured, drawn from its own pixels rather than a saved
 * image file: the confirm screen (#21) works from the `Pixels` the camera or
 * a chosen photo produced, and nothing here re-encodes them.
 *
 * `getContext('2d')` is null under jsdom, so every unit test runs this with
 * no canvas at all. The tap handler still has to work then, which is why it
 * reads the element's own bounding rect rather than anything the drawing
 * effect sets up.
 *
 * Takes taps but no `tabIndex`: when a tap is worth having, the confirm
 * screen shows "Pick by hand" as a permanent, keyboard-reachable link, so
 * nothing depends on this element itself being focusable.
 *
 * `fit` picks how the frame is drawn, `cover` or `contain` (see
 * framePoint.ts), and is passed straight through to the tap and mark math so
 * they read the same box the canvas is actually drawn into. It defaults to
 * `cover`, which is right for a photo shown next to its reading: there is
 * nothing to tap, so filling the box looks better than bars around it.
 */
export function FramePhoto({
  pixels,
  onTap,
  mark,
  fit = 'cover',
}: {
  pixels: Pixels;
  onTap?: (x: number, y: number) => void;
  mark?: { x: number; y: number };
  fit?: Fit;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [rect, setRect] = useState<Rect>(zeroRect);

  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context || typeof ImageData === 'undefined') return;
    // `Uint8ClampedArray`'s type covers any `ArrayBufferLike`, but
    // `ImageData` wants one backed by a plain `ArrayBuffer`. Copying into a
    // fresh array settles that; it is not a defensive copy against
    // mutation, since `pixels.data` is never written to after capture.
    const data = new Uint8ClampedArray(pixels.data);
    context.putImageData(new ImageData(data, pixels.width, pixels.height), 0, 0);
  }, [pixels]);

  // Measured only when there is a mark to place: the rect is otherwise dead
  // weight, and a resize listener on a screen with no mark would fire state
  // updates nothing reads.
  useLayoutEffect(() => {
    if (!mark) return;
    function measure() {
      const measured = canvas.current?.getBoundingClientRect();
      if (measured) setRect(measured);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mark]);

  const fraction = mark ? elementPoint(mark, rect, pixels.width, pixels.height, fit) : null;

  return (
    <div {...stylex.props(styles.wrap)}>
      <canvas
        ref={canvas}
        role="img"
        aria-label="Your photo"
        width={pixels.width}
        height={pixels.height}
        onClick={
          onTap
            ? (event) => {
                const point = framePoint(
                  event.clientX,
                  event.clientY,
                  event.currentTarget.getBoundingClientRect(),
                  pixels.width,
                  pixels.height,
                  fit,
                );
                if (point) onTap(point.x, point.y);
              }
            : undefined
        }
        {...stylex.props(
          styles.photo,
          fit === 'contain' ? styles.contain : styles.cover,
          onTap && styles.tappable,
        )}
      />
      {fraction && (
        <div
          data-testid="tap-mark"
          {...stylex.props(styles.mark(`${fraction.left * 100}%`, `${fraction.top * 100}%`))}
        />
      )}
    </div>
  );
}
