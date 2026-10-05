import { IMAGE_FONTS, type DrawOp, type Measure } from './layout';
import { SHARE_FILE_NAME, type SharePort, type ShareResult } from './port';

/* v8 ignore start */
// Canvas painting and object URLs. jsdom implements neither, so no unit test
// can reach these lines. e2e/features/share.feature checks the painted image
// pixel by pixel, and the download, in a real browser.

/** A light block's hairline, tokens.line at twice the screen's width for a 1080 wide image. */
const HAIRLINE = 'rgba(0, 0, 0, 0.2)';

async function render(
  build: (measure: Measure) => readonly DrawOp[],
  width: number,
  height: number,
): Promise<File | null> {
  // A canvas does not wait for a web font the way a page does: text painted
  // or measured before the face loads uses the fallback for good. A face that
  // will not load still leaves an image worth sharing, in the stack's next
  // font.
  await Promise.all(IMAGE_FONTS.map((font) => document.fonts.load(font).catch(() => [])));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'start';
  const ops = build((text, font) => {
    context.font = font;
    return context.measureText(text).width;
  });

  for (const op of ops) {
    if (op.kind === 'fill') {
      context.fillStyle = op.color;
      context.fillRect(0, 0, width, height);
    } else if (op.kind === 'block') {
      context.fillStyle = op.color;
      context.beginPath();
      context.roundRect(op.x, op.y, op.width, op.height, op.radius);
      context.fill();
      if (op.hairline) {
        context.strokeStyle = HAIRLINE;
        context.lineWidth = 2;
        context.beginPath();
        context.roundRect(op.x + 1, op.y + 1, op.width - 2, op.height - 2, op.radius - 1);
        context.stroke();
      }
    } else {
      context.font = op.font;
      context.fillStyle = op.color;
      context.fillText(op.text, op.x, op.y);
    }
  }

  const blob = new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  // toBlob copies the bitmap when it is called, so the canvas can go now. The
  // button paints one per change of outfit, about 5.8 MB each, and iOS
  // Safari stops handing out 2D contexts once its canvas memory cap is
  // reached, long before garbage collection would have caught up.
  canvas.width = 0;
  canvas.height = 0;
  const png = await blob;
  return png ? new File([png], SHARE_FILE_NAME, { type: 'image/png' }) : null;
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  // Not revoked in the same task: Firefox, the browser most likely to land
  // here, has dropped downloads whose URL was revoked right after the click.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
/* v8 ignore stop */

async function share(data: ShareData): Promise<ShareResult> {
  try {
    await navigator.share(data);
    return 'shared';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'dismissed' : 'failed';
  }
}

async function copy(text: string): Promise<boolean> {
  try {
    // Missing outside a secure context, and from older browsers.
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const browserShare: SharePort = {
  render,
  // Both are missing from desktop Firefox, and canShare from older Safari,
  // which is why each is looked up rather than assumed.
  canShareFiles: (files) =>
    typeof navigator.canShare === 'function' && navigator.canShare({ files }),
  canShare: () => typeof navigator.share === 'function',
  share,
  download,
  copy,
};
