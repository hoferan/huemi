import type { DrawOp } from './layout';

/** How a share sheet ended. Closing the sheet is the user's answer, not a failure. */
export type ShareResult = 'shared' | 'dismissed' | 'failed';

/**
 * Everything sharing needs from the device, behind one seam, as the camera
 * has `src/features/camera/port.ts`.
 *
 * Results rather than exceptions. Painting is here with the share sheet
 * because jsdom has no canvas: behind the port, every path through a share
 * runs under Vitest against a fake.
 */
export interface SharePort {
  /** Null when the device could not paint it. */
  render(ops: readonly DrawOp[], width: number, height: number): Promise<File | null>;
  canShareFiles(files: File[]): boolean;
  canShare(): boolean;
  share(data: ShareData): Promise<ShareResult>;
  download(file: File): void;
}

export const SHARE_TITLE = 'huemi outfit';
export const SHARE_FILE_NAME = 'huemi-outfit.png';
