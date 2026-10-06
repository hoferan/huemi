/**
 * The `<meta>` names `vite.config.ts` writes into `index.html`, which repeats
 * them since it cannot import this file. The build info sits in the page and
 * not in a chunk so that every chunk's hashed name stays the same from one
 * build of a commit to the next (ADR 0019).
 */
export const BUILD_META = { commit: 'huemi-build-commit', date: 'huemi-build-date' } as const;

function meta(name: string): string {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || 'unknown';
}

/** Which commit this build came from and when that commit was made, or `unknown`. */
export function readBuild(): { commit: string; date: string } {
  return { commit: meta(BUILD_META.commit), date: meta(BUILD_META.date) };
}
