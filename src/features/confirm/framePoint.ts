export type Rect = { left: number; top: number; width: number; height: number };

/**
 * Where a tap on the photo lands in the frame's own pixels.
 *
 * The photo is drawn with `object-fit: cover`, so it is scaled to fill the
 * element and centred, and whichever axis overflows is cropped equally on both
 * sides. This inverts that. A point outside the element, or an element that
 * has not been laid out yet, is no point at all: reading a region there would
 * report a color the user never pointed at.
 */
export function framePoint(
  clientX: number,
  clientY: number,
  rect: Rect,
  width: number,
  height: number,
): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const ex = clientX - rect.left;
  const ey = clientY - rect.top;
  if (ex < 0 || ey < 0 || ex > rect.width || ey > rect.height) return null;
  const scale = Math.max(rect.width / width, rect.height / height);
  const offsetX = (width * scale - rect.width) / 2;
  const offsetY = (height * scale - rect.height) / 2;
  return { x: (ex + offsetX) / scale, y: (ey + offsetY) / scale };
}

/**
 * The inverse of `framePoint`: where a point in frame pixels sits on the
 * element, as a fraction of its width and height.
 *
 * Used to place the mark that shows where the last reading came from. The
 * mark's position is stored in frame pixels, because that is what survives a
 * resize; this converts it back to element fractions each time the element is
 * measured.
 */
export function elementPoint(
  point: { x: number; y: number },
  rect: Rect,
  width: number,
  height: number,
): { left: number; top: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const scale = Math.max(rect.width / width, rect.height / height);
  const offsetX = (width * scale - rect.width) / 2;
  const offsetY = (height * scale - rect.height) / 2;
  return {
    left: (point.x * scale - offsetX) / rect.width,
    top: (point.y * scale - offsetY) / rect.height,
  };
}
