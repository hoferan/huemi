// Renders the app icons from one drawing. Run it by hand when the logo changes:
//
//   node scripts/make-icons.mjs
//
// It writes public/icon.svg and four PNGs, and the results are committed, so
// building the app needs no image tooling. Playwright is already a dev
// dependency and its Chromium does the rasterising.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const SURFACE = '#cbc7c0';
// The prototype's `saturated` logo, top to bottom (docs/design/prototypes).
const STRIPES = ['#e94e3c', '#f5b83d', '#2e6fdb', '#1d9e75'];

// The prototype draws the logo 28 by 40 with a 9 radius. Here it is 224 by 320,
// centred on a 512 canvas. `scale` shrinks it about the centre, which the
// maskable icon needs: Android may crop that one to a circle, and everything
// has to stay inside the inner 80 percent.
function drawing(scale) {
  const stripes = STRIPES.map(
    (color, i) => `<rect x="144" y="${96 + i * 80}" width="224" height="80" fill="${color}"/>`,
  ).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" fill="${SURFACE}"/>` +
    `<clipPath id="logo"><rect x="144" y="96" width="224" height="320" rx="72"/></clipPath>` +
    `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)" clip-path="url(#logo)">${stripes}</g>` +
    `</svg>`
  );
}

const publicDir = resolve(import.meta.dirname, '..', 'public');
writeFileSync(resolve(publicDir, 'icon.svg'), drawing(1) + '\n');

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.7 },
  { file: 'apple-touch-icon.png', size: 180, scale: 1 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, scale } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${drawing(scale)}`,
  );
  await page.screenshot({ path: resolve(publicDir, file) });
}
await browser.close();
