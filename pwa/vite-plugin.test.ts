// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listBuildFiles, serviceWorker, writeServiceWorker } from './vite-plugin';

let outDir: string;

function put(file: string, content = file) {
  const path = join(outDir, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const worker = () => readFileSync(join(outDir, 'sw.js'), 'utf8');
const cacheName = () => /const CACHE = "([^"]+)"/.exec(worker())?.[1];

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'huemi-sw-'));
  put('index.html');
  put('assets/a-1.js');
  put('manifest.webmanifest');
});

afterEach(() => rmSync(outDir, { recursive: true, force: true }));

describe('service worker plugin', () => {
  it('lists every file except the worker, the host files and source maps', () => {
    put('assets/a-1.js.map');
    put('_redirects');
    put('_headers');
    put('sw.js');
    expect(listBuildFiles(outDir)).toEqual(['assets/a-1.js', 'index.html', 'manifest.webmanifest']);
  });

  it('writes a worker that precaches the root and every listed file', () => {
    writeServiceWorker(outDir);
    const source = worker();
    expect(source).toContain('"/"');
    expect(source).toContain('"/index.html"');
    expect(source).toContain('"/assets/a-1.js"');
    expect(source).toContain('"/manifest.webmanifest"');
    expect(source.endsWith(readFileSync(resolve(import.meta.dirname, 'worker.js'), 'utf8'))).toBe(
      true,
    );
  });

  it('names the cache the same for the same build', () => {
    writeServiceWorker(outDir);
    const first = cacheName();
    writeServiceWorker(outDir);
    expect(cacheName()).toBe(first);
    expect(first).toMatch(/^huemi-[0-9a-f]{10}$/);
  });

  it('renames the cache when a file changes content but not name', () => {
    writeServiceWorker(outDir);
    const before = cacheName();
    put('manifest.webmanifest', '{"changed":true}');
    writeServiceWorker(outDir);
    expect(cacheName()).not.toBe(before);
  });

  it('does not list its own previous output', () => {
    writeServiceWorker(outDir);
    writeServiceWorker(outDir);
    expect(worker()).not.toContain('"/sw.js"');
  });

  it('is a build-only plugin that runs after the others', () => {
    const plugin = serviceWorker();
    expect(plugin.apply).toBe('build');
    expect(plugin.enforce).toBe('post');
  });
});
