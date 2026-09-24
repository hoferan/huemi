import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserCamera, cameraFailure, hasFrame, scaledSize } from './browserCamera';

function withMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });
}

afterEach(() => {
  // jsdom has no mediaDevices of its own; removing the stub restores that.
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
});

describe('cameraFailure', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'unavailable'],
    ['OverconstrainedError', 'unavailable'],
    ['NotReadableError', 'failed'],
    ['AbortError', 'failed'],
  ])('maps %s to %s', (name, reason) => {
    expect(cameraFailure(new DOMException('x', name))).toBe(reason);
  });

  it('treats anything that is not a named error as a failure', () => {
    expect(cameraFailure('boom')).toBe('failed');
    expect(cameraFailure(null)).toBe('failed');
  });
});

describe('scaledSize', () => {
  it('shrinks the long side to the limit and keeps the ratio', () => {
    expect(scaledSize(1920, 1080, 512)).toEqual([512, 288]);
    expect(scaledSize(1080, 1920, 512)).toEqual([288, 512]);
  });

  it('never enlarges', () => {
    expect(scaledSize(300, 200, 512)).toEqual([300, 200]);
  });

  it('never rounds a side down to nothing', () => {
    expect(scaledSize(4000, 3, 32)).toEqual([32, 1]);
  });
});

describe('browserCamera.open', () => {
  it('reports no camera when the browser offers no media devices', async () => {
    await expect(browserCamera.open()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('asks for the rear camera and no audio', async () => {
    const stream = {} as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    withMediaDevices({ getUserMedia });
    await expect(browserCamera.open()).resolves.toEqual({ ok: true, stream });
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
      audio: false,
    });
  });

  it('returns the refusal as a result rather than throwing', async () => {
    withMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')),
    });
    await expect(browserCamera.open()).resolves.toEqual({ ok: false, reason: 'denied' });
  });
});

describe('hasFrame', () => {
  function video(readyState: number, width = 640, height = 480) {
    const element = document.createElement('video');
    Object.defineProperty(element, 'readyState', { value: readyState });
    Object.defineProperty(element, 'videoWidth', { value: width });
    Object.defineProperty(element, 'videoHeight', { value: height });
    return element;
  }

  // Dimensions are known from HAVE_METADATA, before any frame is decoded, and
  // drawing then gives transparent black. A shutter tap in that window would
  // capture a black garment.
  it('says no while only the metadata is in', () => {
    expect(hasFrame(video(HTMLMediaElement.HAVE_METADATA))).toBe(false);
  });

  it('says yes once a frame has been decoded', () => {
    expect(hasFrame(video(HTMLMediaElement.HAVE_CURRENT_DATA))).toBe(true);
  });

  it('says no for a video with no size', () => {
    expect(hasFrame(video(HTMLMediaElement.HAVE_ENOUGH_DATA, 0, 0))).toBe(false);
  });
});

describe('browserCamera.readFrame', () => {
  it('draws nothing before the video has a frame', () => {
    const element = document.createElement('video');
    Object.defineProperty(element, 'readyState', { value: HTMLMediaElement.HAVE_METADATA });
    Object.defineProperty(element, 'videoWidth', { value: 640 });
    Object.defineProperty(element, 'videoHeight', { value: 480 });
    const create = vi.spyOn(document, 'createElement');
    expect(browserCamera.readFrame(element, 32)).toBeNull();
    expect(create).not.toHaveBeenCalledWith('canvas');
    create.mockRestore();
  });
});

describe('browserCamera.readPhoto', () => {
  // jsdom has no createImageBitmap, so this is the browser refusing to decode.
  it('returns a photo it cannot decode as a result rather than throwing', async () => {
    await expect(browserCamera.readPhoto(new File(['x'], 'notes.txt'), 512)).resolves.toEqual({
      ok: false,
      reason: 'undecodable',
    });
  });
});
