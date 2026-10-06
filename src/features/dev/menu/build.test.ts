import { afterEach, describe, expect, it } from 'vitest';
import { BUILD_META, readBuild } from './build';

function addMeta(name: string, content: string) {
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.append(meta);
}

afterEach(() => {
  document.head.querySelectorAll('meta').forEach((meta) => meta.remove());
});

describe('readBuild', () => {
  it('reads the commit and date the build wrote into the page', () => {
    addMeta(BUILD_META.commit, 'abc1234');
    addMeta(BUILD_META.date, '2026-10-05T09:30:00+02:00');
    expect(readBuild()).toEqual({ commit: 'abc1234', date: '2026-10-05T09:30:00+02:00' });
  });

  it('reads unknown without the tags, as under Vitest', () => {
    expect(readBuild()).toEqual({ commit: 'unknown', date: 'unknown' });
  });

  it('reads unknown for an empty tag', () => {
    addMeta(BUILD_META.commit, '');
    expect(readBuild().commit).toBe('unknown');
  });
});
