import type { Frame } from '../../model/frame';

/**
 * Why the camera did not open. The screen designs a state for each one
 * instead of reporting an error: a refusal is the user's answer, and a phone
 * with no usable camera is still a phone.
 */
export type CameraFailure = 'denied' | 'unavailable' | 'failed';

export type CameraResult = { ok: true; stream: MediaStream } | { ok: false; reason: CameraFailure };

/** A photo that will not decode is the user's condition, so it is a result too. */
export type PhotoResult = { ok: true; frame: Frame } | { ok: false; reason: 'undecodable' };

/**
 * Everything the camera screen needs from the device, behind one seam.
 *
 * Results rather than exceptions, as in `src/storage/port.ts`. Drawing and
 * decoding live here along with the stream because jsdom has no canvas and no
 * media playback. Keeping them behind the port is what lets every state of
 * the screen run under Vitest against a fake.
 */
export interface CameraPort {
  open(): Promise<CameraResult>;
  attach(video: HTMLVideoElement, stream: MediaStream): void;
  /** Null until the video has a frame to give. */
  readFrame(video: HTMLVideoElement, maxSide: number): Frame | null;
  readPhoto(file: File, maxSide: number): Promise<PhotoResult>;
}

/** Long side of a captured frame. Enough to read a garment's color from. */
export const FRAME_MAX_SIDE = 512;

/** Long side of the frame the low-light check samples. */
export const SAMPLE_SIDE = 32;

/** How often the low-light check samples the viewfinder. */
export const SAMPLE_INTERVAL_MS = 500;
