// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Windows and macOS file systems ignore case, Linux does not. Two tracked
// files whose paths differ only in case therefore check out side by side in CI
// and collapse into one on a laptop, where an import of one resolves to the
// other. `src/ui/historyTrail.ts` beside `src/ui/HistoryTrail.tsx` did exactly
// that: CI stayed green while the dev server rendered a blank page on Windows.
//
// The extension is dropped before comparing, because module resolution drops
// it too: `./HistoryTrail` matched `historyTrail.ts` before it reached
// `HistoryTrail.tsx`. Two files whose names agree in case and differ only in
// extension, such as an icon in two formats, are left alone. The list comes
// from git rather than from the file system, since a case-insensitive file
// system cannot hold both files to be found.
const tracked = execFileSync('git', ['ls-files'], {
  cwd: import.meta.dirname,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

// A leading dot starts a name rather than an extension: `.editorconfig` keeps it.
const stem = (path: string) => path.replace(/(?<=[^/.])\.[^./]+$/, '');

describe('tracked file names', () => {
  it('never differ only in case, extension aside', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const path of tracked) {
      const key = stem(path).toLowerCase();
      const earlier = seen.get(key);
      if (earlier === undefined) seen.set(key, path);
      else if (stem(earlier) !== stem(path)) clashes.push(`${earlier} and ${path}`);
    }
    expect(clashes).toEqual([]);
  });
});
