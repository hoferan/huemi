export type Rect = { left: number; top: number; width: number; height: number };

/**
 * How the frame is drawn into its element: `cover` scales it to fill the box
 * and crops whichever axis overflows; `contain` scales it to fit inside the
 * box and letterboxes whichever axis falls short instead. Both functions
 * below take this because a client point only converts to a frame point (and
 * back) by inverting whichever one drew it.
 */
export type Fit = 'cover' | 'contain';

function scaleFor(fit: Fit, rect: Rect, width: number, height: number): number {
  return fit === 'contain'
    ? Math.min(rect.width / width, rect.height / height)
    : Math.max(rect.width / width, rect.height / height);
}

/**
 * Where a tap on the photo lands in the frame's own pixels.
 *
 * Under `cover` (the default) the frame is scaled to fill the element and
 * centred, and whichever axis overflows is cropped equally on both sides.
 * Under `contain` it is scaled to fit inside the element instead, and
 * whichever axis falls short is letterboxed equally on both sides; a tap
 * landing in one of those bars is not a tap on the photo, so it comes back
 * null the same as a tap outside the element altogether. A point outside the
 * element, or an element that has not been laid out yet, is no point at all
 * either: reading a region there would report a color the user never pointed
 * at.
 */
export function framePoint(
  clientX: number,
  clientY: number,
  rect: Rect,
  width: number,
  height: number,
  fit: Fit = 'cover',
): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const ex = clientX - rect.left;
  const ey = clientY - rect.top;
  if (ex < 0 || ey < 0 || ex > rect.width || ey > rect.height) return null;
  const scale = scaleFor(fit, rect, width, height);
  const offsetX = (width * scale - rect.width) / 2;
  const offsetY = (height * scale - rect.height) / 2;
  const x = (ex + offsetX) / scale;
  const y = (ey + offsetY) / scale;
  // Under `contain`, offsetX/offsetY run negative (the frame is inset from
  // the element, not overflowing it), so a point in one of the letterbox bars
  // lands outside [0, width] or [0, height] here. Under `cover` this never
  // trips, since the frame always fully covers the element by construction.
  if (x < 0 || x > width || y < 0 || y > height) return null;
  return { x, y };
}

/**
 * The inverse of `framePoint`: where a point in frame pixels sits on the
 * element, as a fraction of its width and height.
 *
 * Used to place the mark that shows where the last reading came from. The
 * mark's position is stored in frame pixels, because that is what survives a
 * resize; this converts it back to element fractions each time the element is
 * measured. `fit` has to match whatever produced the point; a frame point is
 * inside the frame by construction, so unlike `framePoint`, this never has a
 * bar to fall into and returns null only when the element has no size.
 */
export function elementPoint(
  point: { x: number; y: number },
  rect: Rect,
  width: number,
  height: number,
  fit: Fit = 'cover',
): { left: number; top: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const scale = scaleFor(fit, rect, width, height);
  const offsetX = (width * scale - rect.width) / 2;
  const offsetY = (height * scale - rect.height) / 2;
  return {
    left: (point.x * scale - offsetX) / rect.width,
    top: (point.y * scale - offsetY) / rect.height,
  };
}
