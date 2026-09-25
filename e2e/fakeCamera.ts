import type { Page } from '@playwright/test';

/**
 * Replaces the camera before any page script runs.
 *
 * A canvas streamed through `captureStream`, rather than Chromium's fake
 * device flags: the flags give every test the same bright test pattern, and
 * the confirm screen's scenarios need a plain garment, a striped one, a busy
 * background and an outfit in four bands too. There is no binary video
 * fixture either; each scene is painted from the hex values below, written
 * out here so a scenario states what the camera sees rather than pointing at
 * an image file. As with `seedOnboarded`, the callback runs in the browser
 * and cannot close over anything in this module.
 */
export async function fakeCamera(
  page: Page,
  scene: 'bright' | 'dark' | 'denied' | 'garment' | 'striped' | 'busy' | 'outfit',
): Promise<void> {
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
        if (scene === 'garment') {
          context.fillStyle = '#4a6285';
          context.fillRect(0, 0, canvas.width, canvas.height);
          return;
        }
        if (scene === 'striped') {
          // 3:2 bands, so the majority stripe reads as a clear majority
          // rather than a near-even split the reader could call either way.
          const bands: [string, number][] = [
            ['#1f2a44', 24],
            ['#f7f6f3', 16],
          ];
          let y = 0;
          let i = 0;
          while (y < canvas.height) {
            const [color, height] = bands[i % bands.length]!;
            context.fillStyle = color;
            context.fillRect(0, y, canvas.width, height);
            y += height;
            i += 1;
          }
          return;
        }
        if (scene === 'busy') {
          const colors = ['#b9ad9a', '#5d6b52', '#a8413a', '#3a3633', '#d9c38a'];
          for (let row = 0; row * 16 < canvas.height; row += 1) {
            for (let col = 0; col * 16 < canvas.width; col += 1) {
              context.fillStyle = colors[(col + 2 * row) % colors.length]!;
              context.fillRect(col * 16, row * 16, 16, 16);
            }
          }
          // A patch the tap scenario aims at: solid, and a single palette
          // colour, so a tap that lands on it reads as a clean single colour
          // rather than another mix of the grid around it. The unclear state
          // now draws the whole frame with object-fit: contain instead of
          // cropping into it with cover, so the patch sits back near the
          // frame's own left edge; it only has to clear the default read
          // circle (48px radius around 160, 120), which it does with room to
          // spare.
          context.fillStyle = '#1f2a44';
          context.fillRect(8, 80, 80, 80);
          return;
        }
        if (scene === 'outfit') {
          // Four 60px bands, head to toe: a charcoal jacket, a cream top,
          // rust trousers and burgundy shoes, all palette colors so each
          // reads back under its own name.
          const bands = ['#3d3d3f', '#e9dfc9', '#a4522d', '#6b2733'];
          bands.forEach((color, i) => {
            context.fillStyle = color;
            context.fillRect(0, i * 60, canvas.width, 60);
          });
          return;
        }
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
