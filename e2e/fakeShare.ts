import type { Page } from '@playwright/test';

/** A share as the fake share sheet received it, with each file read out as a data URL. */
export type RecordedShare = {
  title?: string;
  text?: string;
  url?: string;
  files: { name: string; type: string; dataUrl: string }[];
};

/**
 * Replaces the system share sheet before any page script runs.
 *
 * Headless Chromium has none, so without this `navigator.share` is missing
 * and every scenario would take the download path. Each share is recorded on
 * `window.__shares`. As with `fakeCamera`, the callback runs in the browser
 * and cannot close over anything in this module.
 *
 * - `files`: a phone that can share the picture
 * - `text`: one that can share only text, as some Android browsers can
 * - `none`: no share sheet at all, as desktop Firefox. Its clipboard is
 *   replaced too, recording on `window.__copied`, because headless Chromium
 *   refuses a clipboard write without a permission grant
 * - `dismiss`: a sheet the user closes without choosing an app
 */
export async function fakeShare(
  page: Page,
  device: 'files' | 'text' | 'none' | 'dismiss',
): Promise<void> {
  await page.addInitScript((device) => {
    const shares: unknown[] = [];
    Object.assign(window, { __shares: shares });
    if (device === 'none') {
      Reflect.deleteProperty(Navigator.prototype, 'share');
      Reflect.deleteProperty(Navigator.prototype, 'canShare');
      const copied: string[] = [];
      Object.assign(window, { __copied: copied });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            copied.push(text);
            return Promise.resolve();
          },
        },
      });
      return;
    }
    const read = (file: File) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data?: ShareData) => device !== 'text' || !data?.files?.length,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        const files = await Promise.all(
          (data.files ?? []).map(async (file) => ({
            name: file.name,
            type: file.type,
            dataUrl: await read(file),
          })),
        );
        shares.push({ title: data.title, text: data.text, url: data.url, files });
        if (device === 'dismiss') throw new DOMException('Share canceled', 'AbortError');
      },
    });
  }, device);
}
