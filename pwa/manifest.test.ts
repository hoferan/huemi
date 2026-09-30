// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const readText = (path: string) => readFileSync(resolve(root, path), 'utf8');

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}
const manifest = JSON.parse(readText('public/manifest.webmanifest')) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  theme_color: string;
  background_color: string;
  icons: Icon[];
};
const html = readText('index.html');

const PNG_SIGNATURE = '89504e470d0a1a0a';

describe('web manifest', () => {
  it('names the app and starts it at the root in a standalone window', () => {
    expect(manifest.name).toBe('huemi');
    expect(manifest.short_name).toBe('huemi');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
  });

  it('uses the surface color for the theme and the background', () => {
    expect(manifest.theme_color).toBe('#cbc7c0');
    expect(manifest.background_color).toBe('#cbc7c0');
    expect(html).toContain('<meta name="theme-color" content="#cbc7c0" />');
  });

  it('points every icon at a real PNG of the size it claims', () => {
    expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose ?? 'any'}`)).toEqual([
      '192x192 any',
      '512x512 any',
      '512x512 maskable',
    ]);
    for (const icon of manifest.icons) {
      const bytes = readFileSync(resolve(root, 'public', icon.src.replace(/^\//, '')));
      expect(icon.type).toBe('image/png');
      expect(bytes.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
      expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });

  it('has a 180 pixel touch icon for the home screen on iPhone', () => {
    const bytes = readFileSync(resolve(root, 'public/apple-touch-icon.png'));
    expect(bytes.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe('180x180');
  });

  it('links the manifest and the icons from the page', () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
    expect(html).toContain('rel="icon" href="/icon.svg"');
  });
});
