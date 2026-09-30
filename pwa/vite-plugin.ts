import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

// Files the host reads and the browser never asks for, plus the worker itself,
// which must not list itself or a rebuild would change its own cache name.
const NOT_PRECACHED = new Set(['sw.js', '_redirects', '_headers']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/** Paths under `outDir` the worker precaches, POSIX separators, sorted. */
export function listBuildFiles(outDir: string): string[] {
  return walk(outDir)
    .map((file) => relative(outDir, file).split('\\').join('/'))
    .filter((file) => !NOT_PRECACHED.has(file) && !file.endsWith('.map'))
    .sort();
}

/**
 * Writes `outDir/sw.js`: the cache name and the file list, then the worker.
 * The name hashes each file's bytes as well as its path, so a manifest or icon
 * that changes under the same name still gives installed clients a new cache.
 */
export function writeServiceWorker(outDir: string): void {
  const files = listBuildFiles(outDir);
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
  const precache = ['/', ...files.map((file) => `/${file}`)];
  const header = `const CACHE = "huemi-${hash.digest('hex').slice(0, 10)}";\nconst PRECACHE = ${JSON.stringify(precache)};\n`;
  const worker = readFileSync(resolve(import.meta.dirname, 'worker.js'), 'utf8');
  writeFileSync(join(outDir, 'sw.js'), header + worker);
}

export function serviceWorker(): Plugin {
  let outDir = '';
  return {
    name: 'huemi-service-worker',
    apply: 'build',
    // Post-order and closeBundle, so the bundle and the copy of `public/` are
    // both on disk by the time the file list is read.
    enforce: 'post',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      writeServiceWorker(outDir);
    },
  };
}
