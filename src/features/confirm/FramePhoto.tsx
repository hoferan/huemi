import { useLayoutEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Pixels } from '../../model/frame';
import { tokens } from '../../styles/tokens.stylex';
import { elementPoint, framePoint, type Fit, type Rect } from './framePoint';

// `mark` below is the only dynamic entry here, and `stylex.create` compiles
// its `left`/`top` into their own null-guards, in case a caller passes one in
// as null. `elementPoint` never returns one: the mark only renders once
// `fraction` is non-null (see below), so no test reaches those guards' other
// branch. The ignore has to bracket the whole object, not just `mark`: the
// StyleX transform rewrites `stylex.create({...})` as one node and gives
// everything inside it that node's own source position, so a v8 ignore
// comment placed on `mark` itself is not seen as covering anything.
/* v8 ignore start */
const styles = stylex.create({
  // No overflow clipping here either, for the same reason as Camera.tsx's
  // viewfinder: the 200% text-size check in e2e/invariants.spec.ts fails any
  // element that hides its own overflow.
  //
  // The wrap takes whatever height the screen leaves it, down to a floor that
  // keeps the photo worth looking at. It cannot get that height from the
  // canvas: `main` has a minimum height and no definite one, so an in-flow
  // canvas's aspect ratio would set the row's height, and on a phone held
  // landscape that pushes "Looks right" below the fold.
  wrap: { position: 'relative', flex: '1', minHeight: '160px' },
  // Out of flow for the reason above: positioned against the wrap, the canvas
  // contributes no intrinsic size and fills whatever box the layout gave it.
  photo: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    width: '100%',
    height: '100%',
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
/* v8 ignore stop */

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
 * `cover`, which suits a photo shown next to a reading of its centre: filling
 * the box looks better than bars around it, and the crop keeps the part that
 * was read. The confirm screen asks for `contain` while it wants a tap, and
 * keeps it for the reading the tap produced, because that reading can come
 * from a part of the frame `cover` crops away. The canvas carries the fit as
 * `data-fit`, since the style that applies it is not rendered under Vitest.
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

  // A layout effect, so the pixels are on the canvas before the browser
  // paints. The confirm screen remounts this component on every change of
  // state, and a passive effect would show one blank frame each time.
  useLayoutEffect(() => {
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
      // `canvas` is this element's own ref, attached for as long as this
      // effect can run, so `measured` guards a canvas that unmounted between
      // the resize event and this handler running, which React does not do.
      // No test reaches the branch where it stays unset.
      /* v8 ignore next */
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
        data-fit={fit}
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
