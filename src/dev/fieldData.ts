/// <reference types="node" />
// Runs in node, inside the dev server: `vite.config.ts` loads it for the
// harness's `/__field/` requests. Nothing in the app imports it.

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_DIR, loadFieldDir } from '../color/fieldFiles';
import { scoreFieldSet, type CaptureScore } from '../color/fieldScore';
import type { FieldExport } from '../model/field';

type Loaded = {
  files: number;
  data: FieldExport | null;
  scored: { scores: CaptureScore[]; skipped: number };
};

// A set of exports runs to tens of megabytes and the harness asks for it on
// every reload, so the merged set and its scores are kept until a file is
// added, removed or rewritten.
let cache: { key: string; loaded: Loaded } | null = null;

function load(dir: string): Loaded {
  const key = existsSync(dir)
    ? readdirSync(dir)
        .filter((n) => n.endsWith('.json.gz'))
        .sort()
        .map((n) => {
          const { size, mtimeMs } = statSync(join(dir, n));
          return `${n}:${size}:${mtimeMs}`;
        })
        .join('|')
    : '';
  if (cache?.key === `${dir}|${key}`) return cache.loaded;
  const { files, data } = loadFieldDir(dir);
  const loaded = { files, data, scored: data ? scoreFieldSet(data) : { scores: [], skipped: 0 } };
  cache = { key: `${dir}|${key}`, loaded };
  return loaded;
}

/**
 * Answers the harness's requests under `/__field/`: `captures` for every
 * capture's score without its pixels, and `frame/<id>` for one capture's raw
 * RGBA bytes, whose size is in its score.
 */
export function fieldResponse(
  path: string,
  dir = FIELD_DIR,
): { status: number; type: string; body: string | Uint8Array } {
  const { files, data, scored } = load(dir);
  if (path === 'captures') {
    return { status: 200, type: 'application/json', body: JSON.stringify({ files, ...scored }) };
  }
  const id = path.startsWith('frame/') ? decodeURIComponent(path.slice('frame/'.length)) : null;
  const capture = id === null ? undefined : data?.captures.find((c) => c.id === id);
  if (!capture) return { status: 404, type: 'text/plain', body: 'Not found' };
  const { data: bytes } = capture.pixels;
  return {
    status: 200,
    type: 'application/octet-stream',
    body: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
  };
}
