import type { Region } from '../../../color/read';
import type { Pixels } from '../../../model/frame';

/**
 * Draws the frame onto the canvas at its own resolution and rings the region
 * the reader sampled, white inside black so it shows on any garment. The ring
 * goes on in frame pixels, so what is marked is exactly what `readColor`
 * sampled, whatever size the canvas is shown at.
 *
 * Does nothing without a 2D context, which is the case under jsdom.
 */
export function drawRegion(canvas: HTMLCanvasElement, pixels: Pixels, region: Region) {
  const { width, height, data } = pixels;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  // A fresh array for the reason FramePhoto.tsx gives: `ImageData` wants one
  // backed by a plain `ArrayBuffer`.
  context.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  context.lineWidth = 2;
  context.strokeStyle = '#ffffff';
  context.beginPath();
  context.arc(region.cx, region.cy, region.r, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = '#000000';
  context.beginPath();
  context.arc(region.cx, region.cy, region.r + 2, 0, Math.PI * 2);
  context.stroke();
}
