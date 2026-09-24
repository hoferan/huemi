import type { Pixels } from '../../model/frame';
import type { CameraFailure, CameraPort } from './port';

export function cameraFailure(error: unknown): CameraFailure {
  const name =
    typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'unavailable';
    default:
      return 'failed';
  }
}

export function scaledSize(width: number, height: number, maxSide: number): [number, number] {
  const k = Math.min(1, maxSide / Math.max(width, height));
  return [Math.max(1, Math.round(width * k)), Math.max(1, Math.round(height * k))];
}

/**
 * Whether the video has a decoded frame to draw.
 *
 * The size alone is not enough. It is known from HAVE_METADATA, before any
 * frame is decoded, and drawing then gives transparent black. A shutter tap in
 * that window would capture a black garment, and every low-light sample would
 * read as darkness.
 */
export function hasFrame(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

const UNDECODABLE = { ok: false, reason: 'undecodable' } as const;

/* v8 ignore start */
// Canvas drawing and media playback. jsdom implements neither, so no unit test
// can reach these lines. The Playwright scenarios in e2e/features/camera.feature
// run them in a real browser instead.
function draw(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxSide: number,
): Pixels | null {
  const [w, h] = scaledSize(width, height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, w, h);
  return { width: w, height: h, data: context.getImageData(0, 0, w, h).data };
}

function attach(video: HTMLVideoElement, stream: MediaStream): void {
  video.srcObject = stream;
  // Browsers allow a muted inline video to autoplay. If play() is refused
  // anyway, no frame is ever decoded, so `hasFrame` keeps the shutter and the
  // low-light check from reading one.
  void video.play().catch(() => undefined);
}

function drawFrame(video: HTMLVideoElement, maxSide: number) {
  const pixels = draw(video, video.videoWidth, video.videoHeight, maxSide);
  return pixels && { pixels, source: 'camera' as const };
}

function drawPhoto(bitmap: ImageBitmap, maxSide: number) {
  try {
    const pixels = draw(bitmap, bitmap.width, bitmap.height, maxSide);
    return pixels
      ? { ok: true as const, frame: { pixels, source: 'photo' as const } }
      : UNDECODABLE;
  } finally {
    bitmap.close();
  }
}
/* v8 ignore stop */

function readFrame(video: HTMLVideoElement, maxSide: number) {
  return hasFrame(video) ? drawFrame(video, maxSide) : null;
}

async function readPhoto(file: File, maxSide: number) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return UNDECODABLE;
  }
  return drawPhoto(bitmap, maxSide);
}

export const browserCamera: CameraPort = {
  async open() {
    // Missing on an insecure origin as well as in a browser with no camera
    // support. The user can act on neither, so both read as unavailable.
    const media = navigator.mediaDevices as MediaDevices | undefined;
    if (!media?.getUserMedia) return { ok: false, reason: 'unavailable' };
    try {
      const stream = await media.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      return { ok: true, stream };
    } catch (error) {
      return { ok: false, reason: cameraFailure(error) };
    }
  },
  attach,
  readFrame,
  readPhoto,
};
