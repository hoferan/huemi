/**
 * The app's own copy of the browser history it has walked, so a back arrow
 * can tell whether its destination is already behind the current entry.
 *
 * The browser does not say what lies behind the current entry, and a fixed
 * destination opened with a plain push leaves the system back button
 * pointing at the screen just left. Stepping back through history instead,
 * when the destination is there, keeps the arrow's destination fixed and the
 * system back button honest.
 *
 * Entries are told apart by React Router's location key, which is unique per
 * history entry. What the trail cannot know is what lay behind the entry the
 * app loaded on, so a pop onto an entry it never saw starts it again from
 * there: nothing is behind, and the arrow falls back to opening its
 * destination.
 */

export type TrailEntry = { key: string; href: string };
export type Trail = { entries: readonly TrailEntry[]; index: number };
export type NavigationType = 'PUSH' | 'REPLACE' | 'POP';

export function startTrail(entry: TrailEntry): Trail {
  return { entries: [entry], index: 0 };
}

export function advanceTrail(trail: Trail, entry: TrailEntry, type: NavigationType): Trail {
  const { entries, index } = trail;
  switch (type) {
    case 'PUSH':
      return { entries: [...entries.slice(0, index + 1), entry], index: index + 1 };
    case 'REPLACE':
      return { entries: entries.with(index, entry), index };
    case 'POP': {
      const found = entries.findIndex((known) => known.key === entry.key);
      return found === -1 ? startTrail(entry) : { entries, index: found };
    }
  }
}

/**
 * How far back the nearest entry at `href` is, as the negative delta
 * `navigate` takes, or null when no entry behind the current one is there.
 */
export function stepsBackTo(trail: Trail, href: string): number | null {
  for (let i = trail.index - 1; i >= 0; i--) {
    if (trail.entries[i]!.href === href) return i - trail.index;
  }
  return null;
}
