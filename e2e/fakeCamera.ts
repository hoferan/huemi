import type { Page } from '@playwright/test';

/**
 * Replaces the camera before any page script runs.
 *
 * A solid canvas streamed through `captureStream`, rather than Chromium's fake
 * device flags. The flags give every test the same bright test pattern, and
 * the low-light scenario needs a dark scene. There is no binary video fixture
 * either; the scene is two hex values. As with `seedOnboarded`, the callback
 * runs in the browser and cannot close over anything in this module.
 */
export async function fakeCamera(page: Page, scene: 'bright' | 'dark' | 'denied'): Promise<void> {
  await page.addInitScript((scene) => {
    function getUserMedia(): Promise<MediaStream> {
      if (scene === 'denied') {
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      }
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d')!;
      // Repainted, because a canvas that never changes may stop producing
      // frames, and the low-light check samples a live video.
      const paint = () => {
        context.fillStyle = scene === 'dark' ? '#101010' : '#c0c0c0';
        context.fillRect(0, 0, canvas.width, canvas.height);
      };
      paint();
      setInterval(paint, 100);
      return Promise.resolve(canvas.captureStream(10));
    }
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
  }, scene);
}
