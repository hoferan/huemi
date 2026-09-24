import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserCamera, cameraFailure, scaledSize } from './browserCamera';

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
