/// <reference types="node" />
// Reads the field exports off disk for the reader's benchmark and for the
// harness, so it needs node's types. Nothing in the app imports it. The
// reference makes node's globals visible to every file tsc checks with it, so
// it does not fence node out of the rest of `src/`; nothing does today.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { FieldExport } from '../model/field';
import { decodeFieldExport, mergeFieldExports } from '../model/fieldExport';

/** Where exports from `/dev/field` go on the PC. Gitignored with the rest of `tmp/`. */
export const FIELD_DIR = 'tmp/field';

/**
 * Every `.json.gz` export in the directory, merged by id with the newest
 * winning. A missing directory, or one without exports, gives no data. A file
 * that is not a field export throws, with its name in the message.
 */
export function loadFieldDir(dir = FIELD_DIR): { files: number; data: FieldExport | null } {
  const names = existsSync(dir)
    ? readdirSync(dir)
        .filter((n) => n.endsWith('.json.gz'))
        .sort()
    : [];
  const exports = names.map((name) => {
    const path = join(dir, name);
    try {
      return decodeFieldExport(gunzipSync(readFileSync(path)).toString('utf8'));
    } catch (error) {
      throw new Error(`${path}: ${(error as Error).message}`, { cause: error });
    }
  });
  return { files: names.length, data: exports.length ? mergeFieldExports(exports) : null };
}
